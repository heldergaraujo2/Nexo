import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= 'postgresql://nexo:nexo@localhost:5432/nexo';

let app: INestApplication;
let db: Pool;
const emails: string[] = [];
describe('phase 11 subscriptions', () => {
  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = ref.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = ref.get(Pool);
  });
  afterAll(async () => {
    await db.query(
      'DELETE FROM subscription_charges WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM subscriptions WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM offers WHERE request_id IN (SELECT id FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',
      [emails],
    );
    await db.query(
      'DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])', [
      emails,
    ]);
    await app?.close();
  });
  it('runs subscription lifecycle and preserves service price', async () => {
    const p = await register('provider');
    const c = await register('customer');
    const service = await db.query(
      "INSERT INTO services(customer_id,provider_id,category,status,price_cents,currency,completed_at) VALUES($1,$2,'passenger_car','completed',2500,'BRL',NOW()) RETURNING id",
      [c.id, p.id],
    );
    const create = await call(
      '/v1/subscriptions',
      'POST',
      {},
      p.token,
      randomUUID(),
    );
    expect(create.status).toBe(201);
    expect(create.body.amountCents).toBe(9990);
    expect(create.body.currency).toBe('BRL');
    const current = await call(
      '/v1/subscriptions/me',
      'GET',
      undefined,
      p.token,
    );
    expect(current.status).toBe(200);
    expect(current.body.id).toBe(create.body.id);
    const invalidPlan = await call(
      '/v1/subscriptions',
      'POST',
      { planCode: 'enterprise' },
      p.token,
      randomUUID(),
    );
    expect(invalidPlan.status).toBe(409);
    const renewKey = randomUUID();
    const renew = await call(
      '/v1/subscriptions/' + create.body.id + '/renew',
      'POST',
      undefined,
      p.token,
      renewKey,
    );
    expect(renew.status).toBe(200);
    expect(renew.body.status).toBe('active');
    const renewReplay = await call(
      '/v1/subscriptions/' + create.body.id + '/renew',
      'POST',
      undefined,
      p.token,
      renewKey,
    );
    expect(renewReplay.status).toBe(200);
    expect(renewReplay.body.id).toBe(renew.body.id);
    const history = await call(
      '/v1/subscriptions/' + create.body.id + '/history',
      'GET',
      undefined,
      p.token,
    );
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);
    const price = await db.query(
      'SELECT price_cents FROM services WHERE id=$1',
      [service.rows[0].id],
    );
    expect(Number(price.rows[0].price_cents)).toBe(2500);
    const cancelKey = randomUUID();
    const cancel = await call(
      '/v1/subscriptions/' + create.body.id + '/cancel',
      'POST',
      { reason: 'voluntary' },
      p.token,
      cancelKey,
    );
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('canceled');
    const cancelReplay = await call(
      '/v1/subscriptions/' + create.body.id + '/cancel',
      'POST',
      { reason: 'voluntary' },
      p.token,
      cancelKey,
    );
    expect(cancelReplay.status).toBe(200);
    expect(cancelReplay.body.status).toBe('canceled');
    const afterCancel = await call(
      '/v1/subscriptions/me',
      'GET',
      undefined,
      p.token,
    );
    expect(afterCancel.body.status).toBe('canceled');
  });
  it('enforces idempotency, authorization and concurrent create', async () => {
    const p = await register('provider');
    const key = randomUUID();
    const a = await call('/v1/subscriptions', 'POST', {}, p.token, key);
    const b = await call('/v1/subscriptions', 'POST', {}, p.token, key);
    expect(b.body.id).toBe(a.body.id);
    const conflict = await call(
      '/v1/subscriptions',
      'POST',
      { planCode: 'professional_monthly' },
      p.token,
      key,
    );
    expect(conflict.status).toBe(409);
    const concurrentProvider = await register('provider');
    const concurrent = await Promise.all([
      call(
        '/v1/subscriptions',
        'POST',
        {},
        concurrentProvider.token,
        randomUUID(),
      ),
      call(
        '/v1/subscriptions',
        'POST',
        {},
        concurrentProvider.token,
        randomUUID(),
      ),
    ]);
    expect(concurrent.filter((x) => x.status === 201)).toHaveLength(1);
    expect(concurrent.filter((x) => x.status === 409)).toHaveLength(1);
    const customer = await register('customer');
    expect(
      (
        await call(
          '/v1/subscriptions',
          'POST',
          {},
          customer.token,
          randomUUID(),
        )
      ).status,
    ).toBe(403);
  });
  it(
    'rejects providers without an active subscription in marketplace eligibility',
    async () => {
      const p = await register('provider');
      const c = await register('customer');
      await call(
        '/v1/me/marketplace',
        'PUT',
        {
          categories: ['passenger_car'],
          availability: 'available',
          acceptingRequests: true,
        },
        p.token,
      );
      const request = await call(
        '/v1/requests',
        'POST',
        {
          category: 'passenger_car',
          origin: { latitude: 0, longitude: 0 },
          destination: { latitude: 0.01, longitude: 0.01 },
        },
        c.token,
        randomUUID(),
      );
      expect(request.status).toBe(201);
      const offer = await call(
        '/v1/requests/' + request.body.id + '/offers',
        'POST',
        { offerType: 'direct_accept' },
        p.token,
        randomUUID(),
      );
      expect(offer.status).toBe(403);
    },
  );
  it(
    'blocks new marketplace offers after subscription cancellation',
    async () => {
      const p = await register('provider');
      const c = await register('customer');
      await call(
        '/v1/me/marketplace',
        'PUT',
        {
          categories: ['passenger_car'],
          availability: 'available',
          acceptingRequests: true,
        },
        p.token,
      );
      const request = await call(
        '/v1/requests',
        'POST',
        {
          category: 'passenger_car',
          origin: { latitude: 0, longitude: 0 },
          destination: { latitude: 0.01, longitude: 0.01 },
        },
        c.token,
        randomUUID(),
      );
      expect(request.status).toBe(201);
      const sub = await call(
        '/v1/subscriptions',
        'POST',
        {},
        p.token,
        randomUUID(),
      );
      expect(
        (
          await call(
            '/v1/subscriptions/' + sub.body.id + '/renew',
            'POST',
            undefined,
            p.token,
            randomUUID(),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await call(
            '/v1/subscriptions/' + sub.body.id + '/cancel',
            'POST',
            { reason: 'test' },
            p.token,
            randomUUID(),
          )
        ).status,
      ).toBe(200);
      const offer = await call(
        '/v1/requests/' + request.body.id + '/offers',
        'POST',
        { offerType: 'direct_accept' },
        p.token,
        randomUUID(),
      );
      expect(offer.status).toBe(403);
    },
  );
  it(
    'enforces database ownership between charges and subscriptions',
    async () => {
      const p = await register('provider');
      const other = await register('provider');
      const sub = await call(
        '/v1/subscriptions',
        'POST',
        {},
        p.token,
        randomUUID(),
      );
      await expect(
        db.query(
          `INSERT INTO subscription_charges(
            subscription_id,provider_id,period_start,period_end,
            amount_cents,currency,status,idempotency_key
          ) VALUES($1,$2,NOW(),NOW()+INTERVAL '1 month',9990,'BRL','pending',$3)`,
          [sub.body.id, other.id, randomUUID()],
        ),
      ).rejects.toThrow();
    },
  );
  it('rejects foreign history and missing idempotency key', async () => {
    const p = await register('provider');
    const other = await register('provider');
    const sub = await call(
      '/v1/subscriptions',
      'POST',
      {},
      p.token,
      randomUUID(),
    );
    expect(
      (
        await call(
          '/v1/subscriptions/' + sub.body.id + '/history',
          'GET',
          undefined,
          other.token,
        )
      ).status,
    ).toBe(403);
    expect((await call('/v1/subscriptions', 'POST', {}, p.token)).status).toBe(
      409,
    );
  });
});
async function register(role: 'customer' | 'provider') {
  const email = 'phase11-' + role + '-' + randomUUID() + '@example.test';
  emails.push(email);
  const r = await call('/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: 'Phase 11',
    role,
  });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return {
    id: r.body.accountId as string,
    token: r.body.accessToken as string,
  };
}
async function call(
  path: string,
  method: string,
  body?: unknown,
  token?: string,
  key?: string,
) {
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string')
    throw new Error('server address unavailable');
  const r = await fetch(
    'http://127.0.0.1:' + (address as AddressInfo).port + path,
    {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...(key ? { 'idempotency-key': key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  return {
    status: r.status,
    body: (await r.json()) as Record<string, unknown>,
  };
}
