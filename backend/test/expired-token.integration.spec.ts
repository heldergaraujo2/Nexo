import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/token.service';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= 'postgresql://nexo:nexo@localhost:5432/nexo';

/**
 * Expired-token simulation: TokenService.sign(principal, expiresInSeconds)
 * accepts a TTL — we pass a NEGATIVE TTL so `exp` is already in the past when
 * the request arrives. verify() enforces `payload.exp <= now -> 401`, which is
 * exactly the production expiration behaviour (default TTL 900s).
 */
let app: INestApplication;
let db: Pool;
let base: string;
let accountId: string;
const email = `nexo.expired.${Date.now()}@example.test`;

describe('expired access token rejection', () => {
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
        displayName: 'Expired Test',
        role: 'customer',
      }),
    });
    expect(reg.status).toBe(201);
    accountId = ((await reg.json()) as { accountId: string }).accountId;
  });

  afterAll(async () => {
    if (db && accountId) {
      await db.query('DELETE FROM profiles WHERE account_id=$1', [accountId]);
      await db.query('DELETE FROM accounts WHERE id=$1', [accountId]);
    }
    await app?.close();
  });

  it('rejects a token whose exp is in the past with 401', async () => {
    const tokens = new TokenService();
    const expired = tokens.sign({ accountId, role: 'customer' }, -60);
    const res = await fetch(`${base}/me`, {
      headers: { authorization: `Bearer ${expired}` },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe('Invalid access token');
  });

  it('accepts a fresh token signed with the same secret (positive control)', async () => {
    const tokens = new TokenService();
    const fresh = tokens.sign({ accountId, role: 'customer' }, 900);
    const res = await fetch(`${base}/me`, {
      headers: { authorization: `Bearer ${fresh}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accountId: string };
    expect(body.accountId).toBe(accountId);
  });
});
