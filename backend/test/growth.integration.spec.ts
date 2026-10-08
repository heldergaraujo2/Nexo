import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { TokenService } from '../src/auth/token.service';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= 'postgresql://nexo:nexo@localhost:5432/nexo';

let app: INestApplication;
let db: Pool;
const emails: string[] = [];

describe('phase 12 growth and retention', () => {
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
      'DELETE FROM campaign_redemptions WHERE account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM referrals WHERE referred_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR referrer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM founder_program WHERE account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query(
      'DELETE FROM referral_codes WHERE account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',
      [emails],
    );
    await db.query("DELETE FROM campaigns WHERE code LIKE 'PHASE12-TEST-%'");
    await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])', [
      emails,
    ]);
    await app?.close();
  });

  it('creates referral code, claims it idempotently and blocks self-referral', async () => {
    const referrer = await register('provider');
    const referred = await register('customer');
    const code = await call(
      '/v1/growth/me/referral-code',
      'GET',
      undefined,
      referrer.token,
    );
    expect(code.status).toBe(200);
    expect(code.body.code).toMatch(/^NXO-/);
    const key = randomUUID();
    const claim = await call(
      '/v1/growth/referrals/claim',
      'POST',
      { code: code.body.code },
      referred.token,
      key,
    );
    expect(claim.status).toBe(201);
    const replay = await call(
      '/v1/growth/referrals/claim',
      'POST',
      { code: code.body.code },
      referred.token,
      key,
    );
    expect(replay.body.id).toBe(claim.body.id);
    const self = await call(
      '/v1/growth/referrals/claim',
      'POST',
      { code: code.body.code },
      referrer.token,
      randomUUID(),
    );
    expect(self.status).toBe(409);
  });

  it('redeems campaign and enrolls founder without monetary side effects', async () => {
    const admin = await createAdmin();
    const customer = await register('customer');
    const campaign = await call(
      '/v1/admin/growth/campaigns',
      'POST',
      {
        code: 'PHASE12-TEST-CAMPAIGN',
        name: 'Phase 12 Test',
        status: 'active',
      },
      admin.token,
    );
    expect(campaign.status).toBe(201);
    const campaigns = await call(
      '/v1/growth/campaigns',
      'GET',
      undefined,
      customer.token,
    );
    expect(campaigns.status).toBe(200);
    expect(campaigns.body).toHaveLength(1);
    const redeem = await call(
      '/v1/growth/campaigns/redeem',
      'POST',
      { code: 'PHASE12-TEST-CAMPAIGN' },
      customer.token,
      randomUUID(),
    );
    expect(redeem.status).toBe(201);
    const duplicate = await call(
      '/v1/growth/campaigns/redeem',
      'POST',
      { code: 'PHASE12-TEST-CAMPAIGN' },
      customer.token,
      randomUUID(),
    );
    expect(duplicate.status).toBe(409);
    const founder = await call(
      '/v1/growth/founders/enroll',
      'POST',
      {},
      customer.token,
      randomUUID(),
    );
    expect(founder.status).toBe(201);
  });

  it('keeps growth metrics admin-only and exposes conversion data', async () => {
    const admin = await createAdmin();
    const customer = await register('customer');
    const denied = await call(
      '/v1/admin/growth/metrics/conversion',
      'GET',
      undefined,
      customer.token,
    );
    expect(denied.status).toBe(403);
    const metrics = await call(
      '/v1/admin/growth/metrics/conversion',
      'GET',
      undefined,
      admin.token,
    );
    expect(metrics.status).toBe(200);
    expect(metrics.body).toHaveProperty('offerRate');
    expect(metrics.body).toHaveProperty('acceptanceRate');
    expect(metrics.body).toHaveProperty('completionRate');
  });
});

async function register(role: 'customer' | 'provider') {
  const email = 'phase12-' + role + '-' + randomUUID() + '@example.test';
  emails.push(email);
  const r = await call('/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: 'Phase 12',
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
async function createAdmin() {
  const email = 'phase12-admin-' + randomUUID() + '@example.test';
  emails.push(email);
  const passwords = app.get(PasswordService);
  const tokens = app.get(TokenService);
  const passwordHash = await passwords.hash('Strong-password-123');
  const account = await db.query(
    'INSERT INTO accounts(email,password_hash,role) VALUES($1,$2,$3) RETURNING id',
    [email, passwordHash, 'admin'],
  );
  await db.query(
    'INSERT INTO profiles(account_id,display_name) VALUES($1,$2)',
    [account.rows[0].id, 'Phase 12 Admin'],
  );
  return {
    id: account.rows[0].id as string,
    token: tokens.sign({ accountId: account.rows[0].id, role: 'admin' }),
  };
}
