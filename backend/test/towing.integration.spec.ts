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

describe('towing integration', () => {
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
      'DELETE FROM towing_events WHERE towing_job_id IN (SELECT t.id FROM towing_jobs t JOIN services s ON s.id=t.service_id WHERE s.customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',
      [emails],
    );
    await db.query(
      'DELETE FROM towing_jobs WHERE service_id IN (SELECT id FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',
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
      'DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
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
      'DELETE FROM vehicles WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM security_events WHERE actor_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])', [
      emails,
    ]);
    await app?.close();
  });
  it('creates a towing request with location, destination, problem and media metadata', async () => {
    const customer = await register('customer');
    const response = await call(
      '/v1/towing/requests',
      'POST',
      {
        origin: { latitude: -16.68, longitude: -49.25 },
        destination: { latitude: -16.69, longitude: -49.24 },
        problemDescription: 'Veículo não liga',
        media: [
          {
            objectKey: 'towing/problem.jpg',
            mimeType: 'image/jpeg',
            byteSize: 1200,
            checksumSha256: 'a'.repeat(64),
            caption: 'Painel',
          },
        ],
      },
      customer.token,
      randomUUID(),
    );
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.category).toBe('towing');
  });
  it('requires eligible verified vehicle and executes the towing state machine', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await call(
      '/v1/me/marketplace',
      'PUT',
      {
        categories: ['towing'],
        availability: 'available',
        acceptingRequests: true,
      },
      provider.token,
    );
    const vehicle = await call(
      '/v1/security/vehicles',
      'POST',
      {
        vehicleType: 'car',
        make: 'Marca',
        model: 'Modelo',
        modelYear: 2024,
        plateLast4: 'AB12',
      },
      provider.token,
    );
    expect(vehicle.status).toBe(201);
    await db.query("UPDATE vehicles SET status='verified' WHERE id=$1", [
      vehicle.body.id,
    ]);
    const request = await call(
      '/v1/towing/requests',
      'POST',
      {
        origin: { latitude: -16.68, longitude: -49.25 },
        destination: { latitude: -16.69, longitude: -49.24 },
        problemDescription: 'Pane mecânica',
      },
      customer.token,
      randomUUID(),
    );
    const offer = await call(
      '/v1/requests/' + request.body.id + '/offers',
      'POST',
      { offerType: 'priced_offer', amountCents: 8000 },
      provider.token,
      randomUUID(),
    );
    expect(offer.status, JSON.stringify(offer.body)).toBe(201);
    const accepted = await call(
      '/v1/offers/' + offer.body.id + '/accept',
      'POST',
      undefined,
      customer.token,
      randomUUID(),
    );
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(201);
    const towing = (
      await db.query('SELECT id FROM towing_jobs WHERE service_id=$1', [
        accepted.body.id,
      ])
    ).rows[0].id as string;
    for (const step of [
      'provider-en-route',
      'arrived',
      'loading',
      'in-tow',
      'completed',
    ]) {
      const out = await call(
        '/v1/towing/' + towing + '/' + step,
        'POST',
        {},
        provider.token,
        randomUUID(),
      );
      expect(out.status, JSON.stringify(out.body)).toBe(200);
    }
    const final = await call(
      '/v1/towing/' + towing,
      'GET',
      undefined,
      customer.token,
    );
    expect(final.status).toBe(200);
    expect(final.body.status).toBe('completed');
  });
  it('rejects outsider access, unverified providers and invalid transitions', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    const outsider = await register('customer');
    await call(
      '/v1/me/marketplace',
      'PUT',
      {
        categories: ['towing'],
        availability: 'available',
        acceptingRequests: true,
      },
      provider.token,
    );
    const request = await call(
      '/v1/towing/requests',
      'POST',
      {
        origin: { latitude: -16.68, longitude: -49.25 },
        problemDescription: 'Pane',
      },
      customer.token,
      randomUUID(),
    );
    const offer = await call(
      '/v1/requests/' + request.body.id + '/offers',
      'POST',
      { offerType: 'priced_offer', amountCents: 5000 },
      provider.token,
      randomUUID(),
    );
    expect(offer.status).toBe(403);
    const vehicle = await call(
      '/v1/security/vehicles',
      'POST',
      {
        vehicleType: 'car',
        make: 'Marca',
        model: 'Modelo',
        plateLast4: 'CD34',
      },
      provider.token,
    );
    await db.query("UPDATE vehicles SET status='verified' WHERE id=$1", [
      vehicle.body.id,
    ]);
    const offer2 = await call(
      '/v1/requests/' + request.body.id + '/offers',
      'POST',
      { offerType: 'priced_offer', amountCents: 5000 },
      provider.token,
      randomUUID(),
    );
    expect(offer2.status).toBe(201);
    const denied = await call(
      '/v1/towing/requests/' + request.body.id,
      'GET',
      undefined,
      outsider.token,
    );
    expect(denied.status).toBe(403);
    const accepted = await call(
      '/v1/offers/' + offer2.body.id + '/accept',
      'POST',
      undefined,
      customer.token,
      randomUUID(),
    );
    const towing = (
      await db.query('SELECT id FROM towing_jobs WHERE service_id=$1', [
        accepted.body.id,
      ])
    ).rows[0].id as string;
    const invalid = await call(
      '/v1/towing/' + towing + '/completed',
      'POST',
      {},
      provider.token,
      randomUUID(),
    );
    expect(invalid.status).toBe(409);
  });
});

async function register(role: 'customer' | 'provider') {
  const email = 'phase10-' + role + '-' + randomUUID() + '@example.test';
  emails.push(email);
  const r = await call('/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: 'Phase 10',
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
    throw new Error('Test server address unavailable');
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
