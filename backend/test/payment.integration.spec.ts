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

describe('payments integration', () => {
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
      await db.query(
        `DELETE FROM payment_records WHERE service_id IN (SELECT id FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${p})) OR provider_id IN (SELECT id FROM accounts WHERE email IN (${p})))`,
        users,
      );
      await db.query(
        `DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email IN (${p}))`,
        users,
      );
      await db.query(
        `DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email IN (${p}))`,
        users,
      );
      await db.query(
        `DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${p})) OR provider_id IN (SELECT id FROM accounts WHERE email IN (${p}))`,
        users,
      );
      await db.query(
        `DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${p}))`,
        users,
      );
      await db.query(`DELETE FROM accounts WHERE email IN (${p})`, users);
    }
    await app?.close();
  });

  it('records and confirms cash using the immutable completed-service price', async () => {
    const { customer, provider, serviceId } =
      await createCompletedService('passenger_car');
    const immutable = await db.query(
      'SELECT price_cents FROM services WHERE id=$1',
      [serviceId],
    );
    expect(Number(immutable.rows[0].price_cents)).toBe(1234);
    await expect(
      db.query('UPDATE services SET price_cents=9999 WHERE id=$1', [serviceId]),
    ).rejects.toThrow('Completed service price is immutable');
    const payment = await request(
      app,
      `/v1/payment-records/services/${serviceId}`,
      'POST',
      { method: 'cash' },
      customer.token,
      randomUUID(),
    );
    expect(payment.status, JSON.stringify(payment.body)).toBe(201);
    expect(payment.body.method).toBe('cash');
    expect(payment.body.status).toBe('pending');
    expect(payment.body.confirmedAmountCents).toBeNull();
    const expectedAmountCents = Number(payment.body.expectedAmountCents);
    const confirm = await request(
      app,
      `/v1/payment-records/${payment.body.id}/confirm`,
      'POST',
      { confirmedAmountCents: expectedAmountCents },
      provider.token,
      randomUUID(),
    );
    expect(confirm.status, JSON.stringify(confirm.body)).toBe(200);
    expect(confirm.body.status).toBe('confirmed');
    expect(confirm.body.confirmedAmountCents).toBe(expectedAmountCents);
  });

  it('rejects amount mismatch and card details', async () => {
    const { customer, provider, serviceId } =
      await createCompletedService('passenger_car');
    const payment = await request(
      app,
      `/v1/payment-records/services/${serviceId}`,
      'POST',
      { method: 'provider_card_machine', externalReference: 'POS-123' },
      customer.token,
      randomUUID(),
    );
    expect(payment.status, JSON.stringify(payment.body)).toBe(201);
    const mismatch = await request(
      app,
      `/v1/payment-records/${payment.body.id}/confirm`,
      'POST',
      {
        confirmedAmountCents: (payment.body.expectedAmountCents as number) + 1,
      },
      provider.token,
      randomUUID(),
    );
    expect(mismatch.status, JSON.stringify(mismatch.body)).toBe(409);
    const raw = await db.query('SELECT * FROM payment_records WHERE id=$1', [
      payment.body.id,
    ]);
    expect(raw.rows[0].card_number).toBeUndefined();
    expect(raw.rows[0].cvv).toBeUndefined();
  });

  it('enforces ownership and idempotency', async () => {
    const { customer, serviceId } =
      await createCompletedService('passenger_car');
    const key = randomUUID();
    const first = await request(
      app,
      `/v1/payment-records/services/${serviceId}`,
      'POST',
      { method: 'pix' },
      customer.token,
      key,
    );
    expect(first.status).toBe(201);
    const replay = await request(
      app,
      `/v1/payment-records/services/${serviceId}`,
      'POST',
      { method: 'pix' },
      customer.token,
      key,
    );
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(first.body.id);
    const outsider = await register('customer');
    const forbidden = await request(
      app,
      `/v1/payment-records/${first.body.id}`,
      'GET',
      undefined,
      outsider.token,
    );
    expect(forbidden.status).toBe(403);
  });

  it('prevents retroactive price changes after completion', async () => {
    const { serviceId } = await createCompletedService('passenger_car');
    await expect(
      db.query('UPDATE services SET price_cents=999 WHERE id=$1', [serviceId]),
    ).rejects.toThrow(/Completed service price is immutable/);
    const current = await db.query(
      'SELECT price_cents FROM services WHERE id=$1',
      [serviceId],
    );
    expect(Number(current.rows[0].price_cents)).toBe(1234);
  });

  it('does not allow payment before service completion', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    const service = await db.query(
      `INSERT INTO services (customer_id,provider_id,category,status,price_cents,currency) VALUES ($1,$2,'passenger_car','in_progress',1000,'BRL') RETURNING id`,
      [customer.accountId, provider.accountId],
    );
    users.push(`phase6-extra-${randomUUID()}@example.test`);
    const response = await request(
      app,
      `/v1/payment-records/services/${service.rows[0].id}`,
      'POST',
      { method: 'pix' },
      customer.token,
      randomUUID(),
    );
    expect(response.status, JSON.stringify(response.body)).toBe(409);
  });
});

async function createCompletedService(category: string) {
  const customer = await register('customer');
  const provider = await register('provider');
  const service = await db.query(
    `INSERT INTO services (customer_id,provider_id,category,status,price_cents,currency,completed_at) VALUES ($1,$2,$3,'completed',1234,'BRL',NOW()) RETURNING id`,
    [customer.accountId, provider.accountId, category],
  );
  return { customer, provider, serviceId: service.rows[0].id as string };
}

async function register(role: 'customer' | 'provider') {
  const email = `phase6-${role}-${randomUUID()}@example.test`;
  users.push(email);
  const response = await request(app, '/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: `Phase 6 ${role}`,
    role,
  });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return {
    accountId: response.body.accountId as string,
    token: response.body.accessToken as string,
  };
}

async function request(
  app: INestApplication,
  path: string,
  method: string,
  body?: unknown,
  token?: string,
  idempotencyKey?: string,
) {
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string')
    throw new Error('Test server address unavailable');
  const port = (address as AddressInfo).port;
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
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
