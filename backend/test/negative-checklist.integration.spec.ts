import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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

/** Systematic negative checklist (Section 6). Each test = one checklist row. */
describe('negative checklist (Section 6)', () => {
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    // same pipeline as src/main.ts — these tests exercise real request validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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

  it('wrong password on login answers 401 with a clean body (no stack)', async () => {
    const { email } = await seedAccount();
    const res = await call('POST', '/v1/auth/login', {
      email,
      password: 'Wrong-password-999',
    });
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('stack');
  });

  it('completing a ride before it starts is rejected — 409 invalid transition', async () => {
    const { provider, serviceId } = await seedService('accepted');
    const ride = await db.query(
      `INSERT INTO rides (service_id,vehicle_type,origin,destination,distance_meters,tariff_cents_per_km,fare_cents,state)
       VALUES ($1,'car',$2::jsonb,$3::jsonb,1200,200,247,'accepted') RETURNING id`,
      [
        serviceId,
        JSON.stringify({ latitude: -23.5, longitude: -46.6 }),
        JSON.stringify({ latitude: -23.51, longitude: -46.61 }),
      ],
    );
    const rideId = ride.rows[0].id as string;
    const res = await call(
      'POST',
      `/v1/rides/${rideId}/complete`,
      {},
      provider.token,
      randomUUID(),
    );
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Invalid ride state transition');
  });

  it('unknown service id (valid UUID) answers 404 — not 500, not 400', async () => {
    const { customer } = await seedService('completed');
    const res = await call(
      'GET',
      `/v1/services/${randomUUID()}`,
      undefined,
      customer.token,
    );
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('stack');
  });

  it('unknown ride id (valid UUID) answers 404 — not 500, not 400', async () => {
    const { provider } = await seedService('accepted');
    const res = await call(
      'GET',
      `/v1/rides/${randomUUID()}`,
      undefined,
      provider.token,
    );
    expect(res.status).toBe(404);
  });

  it('missing required fields (register without password) answers 400', async () => {
    const res = await call('POST', '/v1/auth/register', {
      email: `nexo.neg.${randomUUID()}@example.test`,
      displayName: 'Sem senha',
      role: 'customer',
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('stack');
  });

  it('missing required fields (ratings without score) answers 400', async () => {
    const { customer, provider, serviceId } = await seedService('completed');
    const res = await call(
      'POST',
      '/v1/ratings',
      { serviceId, subjectId: provider.accountId },
      customer.token,
    );
    expect(res.status).toBe(400);
  });

  it('duplicate account (known integrity conflict) answers 409 clean', async () => {
    const email = `nexo.neg.${randomUUID()}@example.test`;
    users.push(email);
    const first = await call('POST', '/v1/auth/register', {
      email,
      password: 'Strong-password-123',
      displayName: 'Duplicado',
      role: 'customer',
    });
    expect(first.status).toBe(201);
    const second = await call('POST', '/v1/auth/register', {
      email,
      password: 'Strong-password-123',
      displayName: 'Duplicado',
      role: 'customer',
    });
    expect(second.status).toBe(409);
    expect(second.body.message).toBe('Account already exists');
    expect(JSON.stringify(second.body).toLowerCase()).not.toContain('stack');
  });

  it('concurrent duplicate registration never answers 500 and never leaks a stack (23505 race)', async () => {
    const email = `nexo.neg.${randomUUID()}@example.test`;
    users.push(email);
    const payload = {
      email,
      password: 'Strong-password-123',
      displayName: 'Corrida',
      role: 'customer',
    };
    const [a, b] = await Promise.all([
      call('POST', '/v1/auth/register', payload),
      call('POST', '/v1/auth/register', payload),
    ]);
    for (const res of [a, b]) {
      expect([201, 409]).toContain(res.status);
      expect(JSON.stringify(res.body).toLowerCase()).not.toContain('stack');
    }
    expect([a.status, b.status]).toContain(201);
    expect([a.status, b.status]).toContain(409);
  });

  it('customer attempting a provider-only route answers 403 (role check)', async () => {
    const customer = await seedAccount('customer');
    const provider = await seedAccount('provider');
    const request = await db.query(
      `INSERT INTO service_requests (customer_id,category,status,origin,destination)
       VALUES ($1,'passenger_car','open',$2::jsonb,$3::jsonb) RETURNING id`,
      [
        customer.accountId,
        JSON.stringify({ latitude: -23.5, longitude: -46.6 }),
        JSON.stringify({ latitude: -23.51, longitude: -46.61 }),
      ],
    );
    const res = await call(
      'POST',
      `/v1/requests/${request.rows[0].id}/accept`,
      {},
      customer.token,
      randomUUID(),
    );
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Provider role required');
    void provider;
  });

  it('provider attempting a customer-only route answers 403 (role check)', async () => {
    const provider = await seedAccount('provider');
    const res = await call(
      'POST',
      '/v1/rides/requests',
      {
        vehicleType: 'car',
        origin: { latitude: -23.5, longitude: -46.6 },
        destination: { latitude: -23.51, longitude: -46.61 },
      },
      provider.token,
      randomUUID(),
    );
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Customer role required');
  });
});

type User = { accountId: string; token: string };

async function seedAccount(
  role: 'customer' | 'provider' = 'customer',
): Promise<User & { email: string }> {
  const email = `nexo.neg.${role}-${randomUUID()}@example.test`;
  users.push(email);
  const res = await call('POST', '/v1/auth/register', {
    email,
    password: 'Strong-password-123',
    displayName: `Neg ${role}`,
    role,
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return {
    accountId: res.body.accountId as string,
    token: res.body.accessToken as string,
    email,
  };
}

async function seedService(status: 'accepted' | 'completed') {
  const customer = await seedAccount('customer');
  const provider = await seedAccount('provider');
  const service = await db.query(
    `INSERT INTO services (customer_id,provider_id,category,status,price_cents,currency${status === 'completed' ? ',completed_at' : ''})
     VALUES ($1,$2,'passenger_car',$3,1234,'BRL'${status === 'completed' ? ',NOW()' : ''}) RETURNING id`,
    [customer.accountId, provider.accountId, status],
  );
  return { customer, provider, serviceId: service.rows[0].id as string };
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
