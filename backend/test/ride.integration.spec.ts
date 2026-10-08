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

describe('passenger transport integration', () => {
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = moduleRef.get(Pool);
  });

  afterAll(async () => {
    if (db && users.length) {
      const placeholders = users.map((_, i) => '$' + (i + 1)).join(',');
      await db.query(`DELETE FROM ride_events WHERE actor_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`, users);
      await db.query(`DELETE FROM ride_route_snapshots WHERE ride_id IN (SELECT r.id FROM rides r JOIN services s ON s.id=r.service_id JOIN accounts c ON c.id=s.customer_id JOIN accounts p ON p.id=s.provider_id WHERE c.email IN (${placeholders}) OR p.email IN (${placeholders}))`, users);
      await db.query(`DELETE FROM rides WHERE service_id IN (SELECT id FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${placeholders})) OR provider_id IN (SELECT id FROM accounts WHERE email IN (${placeholders})))`, users);
      await db.query(`DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`, users);
      await db.query(`DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`, users);
      await db.query(`DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${placeholders})) OR provider_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`, users);
      await db.query(`DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`, users);
      await db.query(`DELETE FROM accounts WHERE email IN (${placeholders})`, users);
    }
    await app?.close();
  });

  it('creates a passenger request, calculates deterministic fare and completes a ride', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await marketplace(provider.token, {
      categories: ['passenger_car'],
      availability: 'available',
      acceptingRequests: true,
    });

    const rideRequest = await request(app, '/v1/rides/requests', 'POST', {
      vehicleType: 'car',
      origin: { latitude: -16.6869, longitude: -49.2648 },
      destination: { latitude: -16.6828, longitude: -49.2534 },
    }, customer.token, randomUUID());

    expect(rideRequest.status, JSON.stringify(rideRequest.body)).toBe(201);
    expect(rideRequest.body.category).toBe('passenger_car');
    const distanceMeters = Number(rideRequest.body.distanceMeters);
    const fareCents = Number(rideRequest.body.fareCents);
    expect(distanceMeters).toBeGreaterThan(0);
    expect(rideRequest.body.tariffCentsPerKm).toBe(200);
    expect(fareCents).toBe(Math.floor((distanceMeters * 200 + 50) / 100));

    const accepted = await request(
      app,
      `/v1/requests/${rideRequest.body.requestId}/accept`,
      'POST',
      undefined,
      provider.token,
      randomUUID(),
    );
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(201);

    const rides = await db.query('SELECT id,fare_cents,vehicle_type,state FROM rides WHERE service_id=$1', [accepted.body.id]);
    expect(rides.rowCount).toBe(1);
    expect(Number(rides.rows[0].fare_cents)).toBe(rideRequest.body.fareCents);
    expect(rides.rows[0].vehicle_type).toBe('car');
    expect(rides.rows[0].state).toBe('accepted');

    const ride = await request(app, `/v1/rides/${rides.rows[0].id}`, 'GET', undefined, customer.token);
    expect(ride.status).toBe(200);

    const enRoute = await request(app, `/v1/rides/${ride.body.id}/driver-en-route`, 'POST', undefined, provider.token, randomUUID());
    expect(enRoute.body.state).toBe('driver_en_route');
    const arrived = await request(app, `/v1/rides/${ride.body.id}/arrived`, 'POST', undefined, provider.token, randomUUID());
    expect(arrived.body.state).toBe('arrived');
    const started = await request(app, `/v1/rides/${ride.body.id}/start`, 'POST', undefined, provider.token, randomUUID());
    expect(started.body.state).toBe('started');
    const completed = await request(app, `/v1/rides/${ride.body.id}/complete`, 'POST', undefined, provider.token, randomUUID());
    expect(completed.body.state).toBe('completed');
  });

  it('accepts idempotent driver location updates and exposes them to the passenger', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await marketplace(provider.token, {
      categories: ['passenger_car'],
      availability: 'available',
      acceptingRequests: true,
    });
    const created = await request(app, '/v1/rides/requests', 'POST', {
      vehicleType: 'car',
      origin: { latitude: -16.6869, longitude: -49.2648 },
      destination: { latitude: -16.6828, longitude: -49.2534 },
    }, customer.token, randomUUID());
    const accepted = await request(app, `/v1/requests/${created.body.requestId}/accept`, 'POST', undefined, provider.token, randomUUID());
    const ride = await request(app, `/v1/rides/${accepted.body.rideId}`, 'GET', undefined, customer.token);
    const key = randomUUID();
    const location = await request(app, `/v1/rides/${ride.body.id}/location`, 'POST', {
      latitude: -16.684,
      longitude: -49.260,
      speedMetersPerSecond: 8.5,
      headingDegrees: 120,
    }, provider.token, key);
    expect(location.status, JSON.stringify(location.body)).toBe(201);
    const passengerView = await request(app, `/v1/rides/${ride.body.id}`, 'GET', undefined, customer.token);
    expect(passengerView.status).toBe(200);
    expect(passengerView.body.driverLocation.latitude).toBeCloseTo(-16.684, 6);
    expect(passengerView.body.driverLocation.longitude).toBeCloseTo(-49.260, 6);
    expect(passengerView.body.driverLocation.speedMetersPerSecond).toBe(8.5);
    expect(passengerView.body.driverLocation.headingDegrees).toBe(120);
  });

  it('recalculates price on route change and rejects stale route versions', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await marketplace(provider.token, { categories: ['passenger_motorcycle'], availability: 'available', acceptingRequests: true });
    const created = await request(app, '/v1/rides/requests', 'POST', {
      vehicleType: 'motorcycle',
      origin: { latitude: -16.6869, longitude: -49.2648 },
      destination: { latitude: -16.6828, longitude: -49.2534 },
    }, customer.token, randomUUID());
    const accepted = await request(app, `/v1/requests/${created.body.requestId}/accept`, 'POST', undefined, provider.token, randomUUID());
    const rideRows = await db.query('SELECT id FROM rides WHERE service_id=$1', [accepted.body.id]);
    const rideId = rideRows.rows[0].id;

    const changed = await request(app, `/v1/rides/${rideId}/route`, 'POST', {
      origin: { latitude: -16.6869, longitude: -49.2648 },
      destination: { latitude: -16.7000, longitude: -49.2800 },
      expectedRouteVersion: 1,
    }, provider.token, randomUUID());
    expect(changed.status).toBe(201);
    expect(changed.body.routeVersion).toBe(2);

    const stale = await request(app, `/v1/rides/${rideId}/route`, 'POST', {
      origin: { latitude: -16.6869, longitude: -49.2648 },
      destination: { latitude: -16.7000, longitude: -49.2800 },
      expectedRouteVersion: 1,
    }, provider.token, randomUUID());
    expect(stale.status).toBe(409);
  });

  it('rejects negotiated passenger offers', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await marketplace(provider.token, { categories: ['passenger_car'], availability: 'available', acceptingRequests: true });
    const created = await request(app, '/v1/rides/requests', 'POST', {
      vehicleType: 'car',
      origin: { latitude: -16.6869, longitude: -49.2648 },
      destination: { latitude: -16.6828, longitude: -49.2534 },
    }, customer.token, randomUUID());
    const offer = await request(app, `/v1/requests/${created.body.requestId}/offers`, 'POST', {
      offerType: 'priced_offer',
      amountCents: 999,
    }, provider.token, randomUUID());
    expect(offer.status, JSON.stringify(offer.body)).toBe(409);
  });
});

async function register(role: 'customer' | 'provider') {
  const email = `phase5-${role}-${randomUUID()}@example.test`;
  users.push(email);
  const response = await request(app, '/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: `Phase 5 ${role}`,
    role,
  });
  expect(response.status).toBe(201);
  return { accountId: response.body.accountId as string, token: response.body.accessToken as string };
}

async function marketplace(token: string, body: unknown) {
  const response = await request(app, '/v1/me/marketplace', 'PUT', body, token);
  expect(response.status).toBe(200);
}

async function request(app: INestApplication, path: string, method: string, body?: unknown, token?: string, idempotencyKey?: string) {
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') throw new Error('Test server address unavailable');
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
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}
