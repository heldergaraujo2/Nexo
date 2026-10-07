import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= 'postgresql://nexo:nexo@localhost:5432/nexo';

describe('identity API integration', () => {
  let app: INestApplication;
  let db: Pool;
  const email = `phase2-${randomUUID()}@example.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0, '127.0.0.1');
    db = moduleRef.get(Pool);
  });

  afterAll(async () => {
    if (db) await db.query('DELETE FROM accounts WHERE email=$1', [email]);
    await app?.close();
  });

  it('registers, authenticates, protects private profile, and exposes only public fields', async () => {
    const register = await request('/v1/auth/register', 'POST', {
      email,
      password: 'Strong-password-123',
      displayName: 'Phase Two',
      role: 'provider',
    });
    expect(register.status).toBe(201);
    expect(register.body.accessToken).toEqual(expect.any(String));

    const token = register.body.accessToken as string;
    const me = await request('/v1/me', 'GET', undefined, token);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
    expect(me.body.displayName).toBe('Phase Two');
    expect(me.body.role).toBeUndefined();

    const publicProfile = await request(`/v1/profiles/${register.body.accountId}`, 'GET');
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.displayName).toBe('Phase Two');
    expect(publicProfile.body.email).toBeUndefined();
    expect(publicProfile.body.password_hash).toBeUndefined();

    const update = await request('/v1/me/profile', 'PUT', { bio: 'Provider bio' }, token);
    expect(update.status).toBe(200);
    expect(update.body.bio).toBe('Provider bio');

    const login = await request('/v1/auth/login', 'POST', {
      email,
      password: 'Strong-password-123',
    });
    expect(login.status).toBe(201);
  });

  it('rejects access to private account data without authentication', async () => {
    const response = await request('/v1/me', 'GET');
    expect(response.status).toBe(401);
  });
});

async function request(path: string, method: string, body?: unknown, token?: string) {
  const response = await fetch(`http://127.0.0.1:${(app as any).getHttpServer().address().port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}
