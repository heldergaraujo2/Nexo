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

describe('marketplace API integration', () => {
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
    if (db && users.length) {
      const placeholders = users.map((_, i) => '$' + (i + 1)).join(',');
      await db.query(
        `DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        `DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        `DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${placeholders})) OR provider_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        `DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        'DELETE FROM subscription_charges WHERE provider_id IN (SELECT id FROM accounts WHERE email IN (' + placeholders + '))',
        users,
      );
      await db.query(
        'DELETE FROM subscriptions WHERE provider_id IN (SELECT id FROM accounts WHERE email IN (' + placeholders + '))',
        users,
      );
      await db.query(
        `DELETE FROM accounts WHERE email IN (${placeholders})`,
        users,
      );
    }
    await app?.close();
  });

  it('creates a request, discovers eligible providers and supports idempotent direct acceptance', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await activateSubscription(provider.token);
    await marketplace(provider.token, {
      categories: ['general'],
      availability: 'available',
      acceptingRequests: true,
    });

    const key = randomUUID();
    const requestBody = {
      category: 'general',
      description: 'Need a generic service',
      requirements: { urgent: true },
    };
    const created = await request(
      app,
      '/v1/requests',
      'POST',
      requestBody,
      customer.token,
      key,
    );
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('open');

    const replay = await request(
      app,
      '/v1/requests',
      'POST',
      requestBody,
      customer.token,
      key,
    );
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(created.body.id);

    const mismatch = await request(
      app,
      '/v1/requests',
      'POST',
      { ...requestBody, description: 'different' },
      customer.token,
      key,
    );
    expect(mismatch.status).toBe(409);

    const matches = await request(
      app,
      `/v1/requests/${created.body.id}/matches`,
      'GET',
      undefined,
      customer.token,
    );
    expect(matches.status).toBe(200);
    const matchRows = matches.body as unknown as Array<Record<string, unknown>>;
    expect(matchRows[0]?.accountId).toBe(provider.accountId);

    const acceptKey = randomUUID();
    const accepted = await request(
      app,
      `/v1/requests/${created.body.id}/accept`,
      'POST',
      undefined,
      provider.token,
      acceptKey,
    );
    expect(accepted.status).toBe(201);
    expect(accepted.body.status).toBe('accepted');

    const acceptReplay = await request(
      app,
      `/v1/requests/${created.body.id}/accept`,
      'POST',
      undefined,
      provider.token,
      acceptKey,
    );
    expect(acceptReplay.status).toBe(201);
    expect(acceptReplay.body.id).toBe(accepted.body.id);

    const service = await request(
      app,
      `/v1/services/${accepted.body.id}`,
      'GET',
      undefined,
      customer.token,
    );
    expect(service.status).toBe(200);
    expect(service.body.requestId).toBe(created.body.id);
  });

  it('serializes concurrent provider acceptance so only one service is created', async () => {
    const customer = await register('customer');
    const providerA = await register('provider');
    const providerB = await register('provider');
    for (const provider of [providerA, providerB]) {
      await activateSubscription(provider.token);
      await marketplace(provider.token, {
        categories: ['concurrency'],
        availability: 'available',
        acceptingRequests: true,
      });
    }

    const created = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'concurrency' },
      customer.token,
      randomUUID(),
    );

    const [a, b] = await Promise.all([
      request(
        app,
        `/v1/requests/${created.body.id}/accept`,
        'POST',
        undefined,
        providerA.token,
        randomUUID(),
      ),
      request(
        app,
        `/v1/requests/${created.body.id}/accept`,
        'POST',
        undefined,
        providerB.token,
        randomUUID(),
      ),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const services = await db.query(
      'SELECT id FROM services WHERE request_id=$1',
      [created.body.id],
    );
    expect(services.rowCount).toBe(1);
  });

  it('supports priced offers, customer acceptance and service state transitions', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await activateSubscription(provider.token);
    await marketplace(provider.token, {
      categories: ['priced'],
      availability: 'available',
      acceptingRequests: true,
    });

    const created = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'priced' },
      customer.token,
      randomUUID(),
    );
    const offer = await request(
      app,
      `/v1/requests/${created.body.id}/offers`,
      'POST',
      {
        offerType: 'priced_offer',
        amountCents: 2500,
        message: 'Can do this service',
      },
      provider.token,
      randomUUID(),
    );
    expect(offer.status).toBe(201);

    const accepted = await request(
      app,
      `/v1/offers/${offer.body.id}/accept`,
      'POST',
      undefined,
      customer.token,
      randomUUID(),
    );
    expect(accepted.status).toBe(201);
    expect(accepted.body.priceCents).toBe(2500);

    const started = await request(
      app,
      `/v1/services/${accepted.body.id}/start`,
      'POST',
      undefined,
      provider.token,
      randomUUID(),
    );
    expect(started.status).toBe(200);
    expect(started.body.status).toBe('in_progress');

    const completed = await request(
      app,
      `/v1/services/${accepted.body.id}/complete`,
      'POST',
      undefined,
      provider.token,
      randomUUID(),
    );
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('completed');
  });

  it('rejects unauthorized request creation and missing idempotency keys', async () => {
    const provider = await register('provider');
    const response = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'general' },
      provider.token,
      randomUUID(),
    );
    expect(response.status).toBe(403);

    const customer = await register('customer');
    const missingKey = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'general' },
      customer.token,
    );
    expect(missingKey.status).toBe(409);
  });
});

async function activateSubscription(token: string) {
  const created = await request(
    app,
    '/v1/subscriptions',
    'POST',
    {},
    token,
    randomUUID(),
  );
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  const renewed = await request(
    app,
    `/v1/subscriptions/${created.body.id}/renew`,
    'POST',
    undefined,
    token,
    randomUUID(),
  );
  expect(renewed.status, JSON.stringify(renewed.body)).toBe(200);
}

async function register(role: 'customer' | 'provider') {
  const email = `phase4-${role}-${randomUUID()}@example.test`;
  users.push(email);
  const response = await request(app, '/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: `Phase 4 ${role}`,
    role,
  });
  expect(response.status).toBe(201);
  return {
    accountId: response.body.accountId as string,
    token: response.body.accessToken as string,
  };
}

async function marketplace(token: string, body: unknown) {
  const response = await request(app, '/v1/me/marketplace', 'PUT', body, token);
  expect(response.status).toBe(200);
  return response;
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
  if (!address || typeof address === 'string') {
    throw new Error('Test server address unavailable');
  }
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
