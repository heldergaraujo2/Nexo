import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= 'postgresql://nexo:nexo@localhost:5432/nexo';

describe('trust and reputation API integration', () => {
  let app: INestApplication;
  let db: Pool;
  let customerId: string;
  let providerId: string;
  let serviceId: string;
  let customerToken: string;
  let providerToken: string;
  let adminToken: string;
  const suffix = randomUUID();
  const customerEmail = `trust-customer-${suffix}@example.test`;
  const providerEmail = `trust-provider-${suffix}@example.test`;
  const adminEmail = `trust-admin-${suffix}@example.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = moduleRef.get(Pool);

    const customer = await request(app, '/v1/auth/register', 'POST', {
      email: customerEmail,
      password: 'Strong-password-123',
      displayName: 'Trust Customer',
      role: 'customer',
    });
    const provider = await request(app, '/v1/auth/register', 'POST', {
      email: providerEmail,
      password: 'Strong-password-123',
      displayName: 'Trust Provider',
      role: 'provider',
    });
    const admin = await request(app, '/v1/auth/register', 'POST', {
      email: adminEmail,
      password: 'Strong-password-123',
      displayName: 'Trust Admin',
      role: 'customer',
    });

    customerId = customer.body.accountId as string;
    providerId = provider.body.accountId as string;
    customerToken = customer.body.accessToken as string;
    providerToken = provider.body.accessToken as string;

    await db.query('UPDATE accounts SET role=$1 WHERE id=$2', ['admin', admin.body.accountId]);
    const adminLogin = await request(app, '/v1/auth/login', 'POST', {
      email: adminEmail,
      password: 'Strong-password-123',
    });
    adminToken = adminLogin.body.accessToken as string;

    const service = await db.query<{ id: string }>(
      `INSERT INTO services (customer_id,provider_id,category,status,completed_at)
       VALUES ($1,$2,$3,'completed',NOW()) RETURNING id`,
      [customerId, providerId, 'passenger_transport'],
    );
    const serviceRow = service.rows[0];
    if (!serviceRow) throw new Error('Service seed failed');
    serviceId = serviceRow.id;
  });

  afterAll(async () => {
    if (db) {
      await db.query('DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email IN ($1,$2,$3))', [
        customerEmail, providerEmail, adminEmail,
      ]);
      await db.query('DELETE FROM safety_reports WHERE reporter_id IN (SELECT id FROM accounts WHERE email IN ($1,$2,$3))', [
        customerEmail, providerEmail, adminEmail,
      ]);
      await db.query('DELETE FROM ratings WHERE author_id IN (SELECT id FROM accounts WHERE email IN ($1,$2,$3))', [
        customerEmail, providerEmail, adminEmail,
      ]);
      await db.query('DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email IN ($1,$2,$3)) OR provider_id IN (SELECT id FROM accounts WHERE email IN ($1,$2,$3))', [
        customerEmail, providerEmail, adminEmail, customerEmail, providerEmail, adminEmail,
      ]);
      await db.query('DELETE FROM accounts WHERE email IN ($1,$2,$3)', [
        customerEmail, providerEmail, adminEmail,
      ]);
    }
    await app?.close();
  });

  it('allows one bilateral rating per completed service and publishes reputation', async () => {
    const first = await request(app, '/v1/ratings', 'POST', {
      serviceId,
      subjectId: providerId,
      score: 5,
      comment: 'Excelente atendimento',
    }, customerToken);
    expect(first.status).toBe(201);

    const duplicate = await request(app, '/v1/ratings', 'POST', {
      serviceId,
      subjectId: providerId,
      score: 4,
    }, customerToken);
    expect(duplicate.status).toBe(409);

    const reverse = await request(app, '/v1/ratings', 'POST', {
      serviceId,
      subjectId: customerId,
      score: 4,
    }, providerToken);
    expect(reverse.status).toBe(201);

    const reputation = await request(app, `/v1/profiles/${providerId}/ratings`, 'GET');
    expect(reputation.status).toBe(200);
    expect(reputation.body.total).toBe(1);
    expect(reputation.body.average).toBe('5.00');
  });

  it('rejects ratings without a valid service relationship', async () => {
    const other = await db.query<{ id: string }>(
      `INSERT INTO services (customer_id,provider_id,category,status,completed_at)
       VALUES ($1,$2,$3,'completed',NOW()) RETURNING id`,
      [customerId, providerId, 'delivery'],
    );
    const otherRow = other.rows[0];
    if (!otherRow) throw new Error('Secondary service fixture was not created');
    const response = await request(app, '/v1/ratings', 'POST', {
      serviceId: otherRow.id,
      subjectId: customerId,
      score: 5,
    }, customerToken);
    expect(response.status).toBe(403);
  });

  it('supports favorites, blocks and safety reports with ownership checks', async () => {
    const favorite = await request(app, '/v1/favorites', 'POST', {
      targetAccountId: providerId,
    }, customerToken);
    expect(favorite.status).toBe(201);

    const favorites = await request(app, '/v1/me/favorites', 'GET', undefined, customerToken);
    expect(favorites.status).toBe(200);
    const favoriteRows = favorites.body as Array<{ accountId: string }>;
    expect(favoriteRows[0]?.accountId).toBe(providerId);

    const block = await request(app, `/v1/safety/blocks/${providerId}`, 'POST', undefined, customerToken);
    expect(block.status).toBe(201);

    const selfBlock = await request(app, `/v1/safety/blocks/${customerId}`, 'POST', undefined, customerToken);
    expect(selfBlock.status).toBe(409);

    const report = await request(app, '/v1/safety/reports', 'POST', {
      targetAccountId: providerId,
      category: 'conduct',
      description: 'Teste de denúncia',
    }, customerToken);
    expect(report.status).toBe(201);
  });

  it('rejects concurrent duplicate ratings through the database uniqueness constraint', async () => {
    const concurrentService = await db.query<{ id: string }>(
      'INSERT INTO services (customer_id,provider_id,category,status,completed_at) VALUES ($1,$2,$3,\'completed\',NOW()) RETURNING id',
      [customerId, providerId, 'passenger_transport'],
    );
    const concurrentRow = concurrentService.rows[0];
    if (!concurrentRow) throw new Error('Concurrent service fixture was not created');
    const responses = await Promise.all([
      request(app, '/v1/ratings', 'POST', { serviceId: concurrentRow.id, subjectId: providerId, score: 5 }, customerToken),
      request(app, '/v1/ratings', 'POST', { serviceId: concurrentRow.id, subjectId: providerId, score: 5 }, customerToken),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  });

  it('enforces the rating moderation state machine', async () => {
    const rating = await db.query<{ id: string }>(
      'SELECT id FROM ratings WHERE service_id=$1 AND author_id=$2',
      [serviceId, customerId],
    );
    const ratingRow = rating.rows[0];
    if (!ratingRow) throw new Error('Rating fixture was not found');

    const flagged = await request(app, '/v1/admin/ratings/' + ratingRow.id + '/moderation', 'PUT', {
      moderationState: 'flagged',
    }, adminToken);
    expect(flagged.status).toBe(200);

    const hidden = await request(app, '/v1/admin/ratings/' + ratingRow.id + '/moderation', 'PUT', {
      moderationState: 'hidden',
    }, adminToken);
    expect(hidden.status).toBe(200);

    const invalid = await request(app, '/v1/admin/ratings/' + ratingRow.id + '/moderation', 'PUT', {
      moderationState: 'published',
    }, adminToken);
    expect(invalid.status).toBe(409);
  });

  it('protects moderation and exposes only verified public indicators', async () => {
    const forbidden = await request(app, '/v1/admin/verifications', 'POST', {
      accountId: providerId,
      verificationType: 'identity',
      status: 'verified',
      publicLabel: 'Identidade verificada',
    }, customerToken);
    expect(forbidden.status).toBe(403);

    const verification = await request(app, '/v1/admin/verifications', 'POST', {
      accountId: providerId,
      verificationType: 'identity',
      status: 'verified',
      publicLabel: 'Identidade verificada',
    }, adminToken);
    expect(verification.status).toBe(201);

    const publicIndicators = await request(app, `/v1/profiles/${providerId}/verification`, 'GET');
    expect(publicIndicators.status).toBe(200);
    expect(publicIndicators.body[0]).toEqual({
      verificationType: 'identity',
      publicLabel: 'Identidade verificada',
    });
  });
});

async function request(
  app: INestApplication,
  path: string,
  method: string,
  body?: unknown,
  token?: string,
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
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}
