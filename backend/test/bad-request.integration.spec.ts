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
let base: string;
let token: string;
let accountId: string;
const email = `nexo.badreq.${Date.now()}@example.test`;

describe('invalid identifier handling (22P02 -> 400, not 500)', () => {
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = moduleRef.get(Pool);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/v1`;

    const reg = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Strong-password-123',
        displayName: 'BadReq Test',
        role: 'customer',
      }),
    });
    expect(reg.status).toBe(201);
    const body = (await reg.json()) as {
      accessToken: string;
      accountId: string;
    };
    token = body.accessToken;
    accountId = body.accountId;
  });

  afterAll(async () => {
    if (db && accountId) {
      await db.query('DELETE FROM profiles WHERE account_id=$1', [accountId]);
      await db.query('DELETE FROM accounts WHERE id=$1', [accountId]);
    }
    await app?.close();
  });

  const call = async (path: string, method = 'GET') => {
    const res = await fetch(base + path, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
    });
    return res;
  };

  it('GET /services/:id with non-uuid id answers 400 (was 500 via pg 22P02)', async () => {
    const res = await call('/services/not-a-uuid');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { statusCode: number };
    expect(body.statusCode).toBe(400);
  });

  it('GET /rides/:id with "undefined" string answers 400', async () => {
    const res = await call('/rides/undefined');
    expect(res.status).toBe(400);
  });

  it('POST /requests/:id/accept with garbage id answers 400', async () => {
    const res = await call('/requests/abc/accept', 'POST');
    expect(res.status).toBe(400);
  });

  it('GET /profiles/:accountId with garbage id answers 400', async () => {
    const res = await fetch(`${base}/profiles/not-a-uuid`);
    expect(res.status).toBe(400);
  });

  it('valid-format but unknown UUID is NOT 400 (ownership/not-found path intact)', async () => {
    const res = await call(`/services/${randomUUID()}`);
    expect(res.status).toBe(404);
  });

  it('missing token is still 401 (auth path intact)', async () => {
    const res = await fetch(`${base}/services/${randomUUID()}`);
    expect(res.status).toBe(401);
  });
});
