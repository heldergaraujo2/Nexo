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
const emails: string[] = [];

describe('subscriptions integration', () => {
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = moduleRef.get(Pool);
  });

  afterAll(async () => {
    if (emails.length) {
      await db.query('DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))', [emails]);
      await db.query('DELETE FROM subscription_charges WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))', [emails]);
      await db.query('DELETE FROM subscriptions WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))', [emails]);
      await db.query('DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))', [emails]);
      await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])', [emails]);
    }
    await app?.close();
  });

  it('creates, renews, returns history and cancels', async () => {
    const provider = await register('provider');
    const key = randomUUID();
    const created = await request('/v1/subscriptions', 'POST', { planCode: 'professional_monthly' }, provider.token, key);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.amountCents).toBe(9990);
    expect(created.body.status).toBe('pending');

    const renewed = await request('/v1/subscriptions/' + created.body.id + '/renew', 'POST', undefined, provider.token, randomUUID());
    expect(renewed.status, JSON.stringify(renewed.body)).toBe(200);
    expect(renewed.body.status).toBe('active');

    const history = await request('/v1/subscriptions/' + created.body.id + '/history', 'GET', undefined, provider.token);
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].amountCents).toBe(9990);

    const canceled = await request('/v1/subscriptions/' + created.body.id + '/cancel', 'POST', { reason: 'voluntary' }, provider.token, randomUUID());
    expect(canceled.status).toBe(200);
    expect(canceled.body.status).toBe('canceled');
  });

  it('is idempotent for create and rejects the same key with a different payload', async () => {
    const provider = await register('provider');
    const key = randomUUID();
    const first = await request('/v1/subscriptions', 'POST', {}, provider.token, key);
    const second = await request('/v1/subscriptions', 'POST', {}, provider.token, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const differentPayload = await request('/v1/subscriptions', 'POST', { planCode: 'professional_monthly' }, provider.token, key);
    expect(differentPayload.status).toBe(409);
  });

  it('allows only one effective concurrent create for the same idempotency key', async () => {
    const provider = await register('provider');
    const key = randomUUID();
    const results = await Promise.all([
      request('/v1/subscriptions', 'POST', {}, provider.token, key),
      request('/v1/subscriptions', 'POST', {}, provider.token, key),
    ]);
    expect(results[0].status).toBe(201);
    expect(results[1].status).toBe(201);
    expect(results[0].body.id).toBe(results[1].body.id);
  });

  it('rejects customers, foreign access and missing idempotency', async () => {
    const customer = await register('customer');
    expect((await request('/v1/subscriptions', 'POST', {}, customer.token, randomUUID())).status).toBe(403);

    const provider = await register('provider');
    const subscription = await request('/v1/subscriptions', 'POST', {}, provider.token, randomUUID());
    const other = await register('provider');
    expect((await request('/v1/subscriptions/' + subscription.body.id + '/history', 'GET', undefined, other.token)).status).toBe(403);
    expect((await request('/v1/subscriptions/' + subscription.body.id + '/renew', 'POST', undefined, provider.token)).status).toBe(409);
  });

  it('does not alter completed service price', async () => {
    const provider = await register('provider');
    const customer = await register('customer');
    const service = await db.query(
      "INSERT INTO services(customer_id,provider_id,category,status,price_cents,currency,completed_at) VALUES($1,$2,'passenger_car','completed',2500,'BRL',NOW()) RETURNING id",
      [customer.accountId, provider.accountId],
    );
    const subscription = await request('/v1/subscriptions', 'POST', {}, provider.token, randomUUID());
    const renewed = await request('/v1/subscriptions/' + subscription.body.id + '/renew', 'POST', undefined, provider.token, randomUUID());
    expect(renewed.status).toBe(200);
    const price = await db.query('SELECT price_cents FROM services WHERE id=$1', [service.rows[0].id]);
    expect(Number(price.rows[0].price_cents)).toBe(2500);
  });

  it('blocks new marketplace work after cancellation', async () => {
    const provider = await register('provider');
    const customer = await register('customer');
    await request('/v1/me/marketplace', 'PUT', { categories: ['passenger_car'], availability: 'available', acceptingRequests: true }, provider.token);
    const serviceRequest = await request('/v1/requests', 'POST', {
      category: 'passenger_car',
      origin: { latitude: 0, longitude: 0 },
      destination: { latitude: 0.01, longitude: 0.01 },
    }, customer.token, randomUUID());
    expect(serviceRequest.status).toBe(201);

    const subscription = await request('/v1/subscriptions', 'POST', {}, provider.token, randomUUID());
    await request('/v1/subscriptions/' + subscription.body.id + '/renew', 'POST', undefined, provider.token, randomUUID());
    await request('/v1/subscriptions/' + subscription.body.id + '/cancel', 'POST', { reason: 'test' }, provider.token, randomUUID());

    const offer = await request('/v1/requests/' + serviceRequest.body.id + '/offers', 'POST', { offerType: 'direct_accept' }, provider.token, randomUUID());
    expect(offer.status).toBe(403);
  });
});

async function register(role: 'provider' | 'customer') {
  const email = 'phase11-' + role + '-' + randomUUID() + '@example.test';
  emails.push(email);
  const response = await request('/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: 'Phase 11 ' + role,
    role,
  });
  expect(response.status).toBe(201);
  return { accountId: response.body.accountId as string, token: response.body.accessToken as string };
}

async function request(path: string, method: string, body?: unknown, token?: string, key?: string) {
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') throw new Error('server address unavailable');
  const response = await fetch('http://127.0.0.1:' + (address as AddressInfo).port + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(key ? { 'idempotency-key': key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}
