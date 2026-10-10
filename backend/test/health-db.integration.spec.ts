import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= 'postgresql://nexo:nexo@localhost:5432/nexo';

let app: INestApplication;
let db: Pool;

describe('GET /health verifies real database connectivity', () => {
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
    await app?.close();
  });

  it('answers 200 {status:ok, database:up} when the pool performs a real SELECT 1', async () => {
    const res = await get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('answers 503 {status:degraded} when the database connection is really dead (pool closed)', async () => {
    await db.end(); // real connection failure — every query now rejects
    const res = await get('/v1/health');
    expect(res.status).toBe(503);
    expect(res.body.message).toBe('degraded');
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('stack');
    // database internals (host/user) must not leak
    expect(JSON.stringify(res.body)).not.toContain('nexo@');
    await app.close();
  });

  it('answers 503 within ~2s when the database hangs (timeout branch)', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Pool)
      .useValue({
        query: () => new Promise(() => undefined),
        end: async () => undefined,
      })
      .compile();
    const hanging = moduleRef.createNestApplication();
    hanging.setGlobalPrefix('v1');
    await hanging.init();
    await hanging.listen(0, '127.0.0.1');
    const started = Date.now();
    const res = await get('/v1/health', hanging);
    const elapsed = Date.now() - started;
    expect(res.status).toBe(503);
    expect(res.body.message).toBe('degraded');
    expect(elapsed).toBeLessThan(4000);
    await hanging.close();
  });
});

async function get(path: string, application?: INestApplication) {
  const target = application ?? app;
  const address = target.getHttpServer().address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}
