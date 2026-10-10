import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= 'postgresql://nexo:nexo@localhost:5432/nexo';

let app: INestApplication;
let db: Pool;
const users: string[] = [];

describe('payment + rating security (negative paths)', () => {
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = moduleRef.get(Pool);
  });

  afterAll(async () => {
    if (users.length) {
      const p = users.map((_, i) => '$' + (i + 1)).join(',');
      const inAccounts = `(SELECT id FROM accounts WHERE email IN (${p}))`;
      const inServices = `(SELECT id FROM services WHERE customer_id IN ${inAccounts} OR provider_id IN ${inAccounts})`;
      await db.query(
        `DELETE FROM ratings WHERE service_id IN ${inServices}`,
        users,
      );
      await db.query(
        `DELETE FROM payment_records WHERE service_id IN ${inServices}`,
        users,
      );
      await db.query(
        `DELETE FROM ride_events WHERE actor_id IN ${inAccounts}`,
        users,
      );
      await db.query(
        `DELETE FROM rides WHERE service_id IN ${inServices}`,
        users,
      );
      await db.query(
        `DELETE FROM idempotency_keys WHERE account_id IN ${inAccounts}`,
        users,
      );
      await db.query(
        `DELETE FROM audit_events WHERE actor_id IN ${inAccounts}`,
        users,
      );
      await db.query(`DELETE FROM services WHERE id IN ${inServices}`, users);
      await db.query(
        `DELETE FROM service_requests WHERE customer_id IN ${inAccounts}`,
        users,
      );
      await db.query(`DELETE FROM accounts WHERE email IN (${p})`, users);
    }
    await app?.close();
  });

  it('a passenger cannot confirm a payment (role check) — 403', async () => {
    const { customer, serviceId } = await createCompletedService();
    const payment = await createPayment(customer, serviceId);
    const res = await call(
      'POST',
      `/v1/payment-records/${payment}/confirm`,
      { confirmedAmountCents: 1234 },
      customer.token,
      randomUUID(),
    );
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Provider role required');
  });

  it('a provider outside the service cannot confirm (ownership check) — 403', async () => {
    const { customer, serviceId } = await createCompletedService();
    const outsider = await register('provider');
    const payment = await createPayment(customer, serviceId);
    const res = await call(
      'POST',
      `/v1/payment-records/${payment}/confirm`,
      { confirmedAmountCents: 1234 },
      outsider.token,
      randomUUID(),
    );
    expect(res.status, 'BODY=' + JSON.stringify(res.body)).toBe(403);
    expect(res.body.message).toBe('Payment confirmation denied');
  });

  it('a customer outside the service cannot register its payment — 403', async () => {
    const { serviceId } = await createCompletedService();
    const outsider = await register('customer');
    const res = await call(
      'POST',
      `/v1/payment-records/services/${serviceId}`,
      { method: 'pix' },
      outsider.token,
      randomUUID(),
    );
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Payment access denied');
  });

  it('a provider cannot register the customer payment — 403', async () => {
    const { provider, serviceId } = await createCompletedService();
    const res = await call(
      'POST',
      `/v1/payment-records/services/${serviceId}`,
      { method: 'pix' },
      provider.token,
      randomUUID(),
    );
    expect(res.status, 'BODY=' + JSON.stringify(res.body)).toBe(403);
    expect(res.body.message).toBe('Customer role required');
  });

  it('a second active payment for the same service is rejected — 409', async () => {
    const { customer, serviceId } = await createCompletedService();
    await createPayment(customer, serviceId);
    const again = await call(
      'POST',
      `/v1/payment-records/services/${serviceId}`,
      { method: 'cash' },
      customer.token,
      randomUUID(),
    );
    expect(again.status).toBe(409);
    expect(again.body.message).toBe(
      'An active payment record already exists for this service',
    );
  });

  it('confirmedAmountCents cannot differ from the expected price — 409 (server-side)', async () => {
    const { customer, provider, serviceId } = await createCompletedService();
    const payment = await createPayment(customer, serviceId);
    const res = await call(
      'POST',
      `/v1/payment-records/${payment}/confirm`,
      { confirmedAmountCents: 1233 },
      provider.token,
      randomUUID(),
    );
    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      'Confirmed amount must equal the expected service price',
    );
  });

  it('rating a service where the user is not part of the pair is rejected — 403', async () => {
    const { provider, serviceId } = await createCompletedService();
    const outsider = await register('customer');
    const res = await call(
      'POST',
      '/v1/ratings',
      { serviceId, subjectId: provider.accountId, score: 5 },
      outsider.token,
    );
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Rating relationship is not allowed');
  });

  it('self-rating is rejected — 403', async () => {
    const { customer, serviceId } = await createCompletedService();
    const res = await call(
      'POST',
      '/v1/ratings',
      { serviceId, subjectId: customer.accountId, score: 5 },
      customer.token,
    );
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Rating relationship is not allowed');
  });

  it('rating the same service twice is rejected — 409', async () => {
    const { customer, provider, serviceId } = await createCompletedService();
    const first = await call(
      'POST',
      '/v1/ratings',
      { serviceId, subjectId: provider.accountId, score: 5 },
      customer.token,
    );
    expect(first.status).toBe(201);
    const second = await call(
      'POST',
      '/v1/ratings',
      { serviceId, subjectId: provider.accountId, score: 1 },
      customer.token,
    );
    expect(second.status).toBe(409);
    expect(second.body.message).toBe('Rating already exists for this service');
  });

  it('rating a service that is not completed is rejected — 409', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    const service = await db.query(
      `INSERT INTO services (customer_id,provider_id,category,status,price_cents,currency) VALUES ($1,$2,'passenger_car','accepted',1234,'BRL') RETURNING id`,
      [customer.accountId, provider.accountId],
    );
    const serviceId = service.rows[0].id as string;
    const res = await call(
      'POST',
      '/v1/ratings',
      { serviceId, subjectId: provider.accountId, score: 5 },
      customer.token,
    );
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Service is not eligible for rating');
  });
});

type User = { accountId: string; token: string };

async function register(role: 'customer' | 'provider'): Promise<User> {
  const email = `nexo.sec.${role}-${randomUUID()}@example.test`;
  users.push(email);
  const res = await call('POST', '/v1/auth/register', {
    email,
    password: 'Strong-password-123',
    displayName: `Sec ${role}`,
    role,
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return {
    accountId: res.body.accountId as string,
    token: res.body.accessToken as string,
  };
}

async function createCompletedService() {
  const customer = await register('customer');
  const provider = await register('provider');
  const service = await db.query(
    `INSERT INTO services (customer_id,provider_id,category,status,price_cents,currency,completed_at) VALUES ($1,$2,'passenger_car','completed',1234,'BRL',NOW()) RETURNING id`,
    [customer.accountId, provider.accountId],
  );
  return { customer, provider, serviceId: service.rows[0].id as string };
}

async function createPayment(customer: User, serviceId: string) {
  const res = await call(
    'POST',
    `/v1/payment-records/services/${serviceId}`,
    { method: 'pix' },
    customer.token,
    randomUUID(),
  );
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.id as string;
}

async function call(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  idempotencyKey?: string,
) {
  const address = app.getHttpServer().address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}
