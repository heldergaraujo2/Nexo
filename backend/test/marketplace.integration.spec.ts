import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = '01234567890123456789012345678901';
process.env.DATABASE_URL ??= '***localhost:5432/nexo';

let app: INestApplication;
let db: Pool;
const users: string[] = [];

describe('marketplace API integration', () => {
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
    if (db && users.length) {
      const placeholders = users.map((_, i) => '$' + (i + 1)).join(',');
      await db.query(
        `DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        `DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        `DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${placeholders})) OR provider_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        `DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email IN (${placeholders}))`,
        users,
      );
      await db.query(
        `DELETE FROM accounts WHERE email IN (${placeholders})`,
        users,
      );
    }
    await app?.close();
  });

  it('creates a request, discovers eligible providers and supports idempotent direct acceptance', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await marketplace(provider.token, {
      categories: ['general'],
      availability: 'available',
      acceptingRequests: true,
    });

    const key = randomUUID();
    const requestBody = {
      category: 'general',
      description: 'Need a generic service',
      requirements: { urgent: true },
    };
    const created = await request(
      app,
      '/v1/requests',
      'POST',
      requestBody,
      customer.token,
      key,
    );
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('open');

    const replay = await request(
      app,
      '/v1/requests',
      'POST',
      requestBody,
      customer.token,
      key,
    );
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(created.body.id);

    const mismatch = await request(
      app,
      '/v1/requests',
      'POST',
      { ...requestBody, description: 'different' },
      customer.token,
      key,
    );
    expect(mismatch.status).toBe(409);

    const matches = await request(
      app,
      `/v1/requests/${created.body.id}/matches`,
      'GET',
      undefined,
      customer.token,
    );
    expect(matches.status).toBe(200);
    const matchRows = matches.body as unknown as Array<Record<string, unknown>>;
    expect(matchRows[0]?.accountId).toBe(provider.accountId);

    const acceptKey = randomUUID();
    const accepted = await request(
      app,
      `/v1/requests/${created.body.id}/accept`,
      'POST',
      undefined,
      provider.token,
      acceptKey,
    );
    expect(accepted.status).toBe(201);
    expect(accepted.body.status).toBe('accepted');

    const acceptReplay = await request(
      app,
      `/v1/requests/${created.body.id}/accept`,
      'POST',
      undefined,
      provider.token,
      acceptKey,
    );
    expect(acceptReplay.status).toBe(201);
    expect(acceptReplay.body.id).toBe(accepted.body.id);

    const service = await request(
      app,
      `/v1/services/${accepted.body.id}`,
      'GET',
      undefined,
      customer.token,
    );
    expect(service.status).toBe(200);
    expect(service.body.requestId).toBe(created.body.id);
  });

  it('serializes concurrent provider acceptance so only one service is created', async () => {
    const customer = await register('customer');
    const providerA = await register('provider');
    const providerB = await register('provider');
    for (const provider of [providerA, providerB]) {
      await marketplace(provider.token, {
        categories: ['concurrency'],
        availability: 'available',
        acceptingRequests: true,
      });
    }

    const created = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'concurrency' },
      customer.token,
      randomUUID(),
    );

    const [a, b] = await Promise.all([
      request(
        app,
        `/v1/requests/${created.body.id}/accept`,
        'POST',
        undefined,
        providerA.token,
        randomUUID(),
      ),
      request(
        app,
        `/v1/requests/${created.body.id}/accept`,
        'POST',
        undefined,
        providerB.token,
        randomUUID(),
      ),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const services = await db.query(
      'SELECT id FROM services WHERE request_id=$1',
      [created.body.id],
    );
    expect(services.rowCount).toBe(1);
  });

  it('supports priced offers, customer acceptance and service state transitions', async () => {
    const customer = await register('customer');
    const provider = await register('provider');
    await marketplace(provider.token, {
      categories: ['priced'],
      availability: 'available',
      acceptingRequests: true,
    });

    const created = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'priced' },
      customer.token,
      randomUUID(),
    );
    const offer = await request(
      app,
      `/v1/requests/${created.body.id}/offers`,
      'POST',
      {
        offerType: 'priced_offer',
        amountCents: 2500,
        message: 'Can do this service',
      },
      provider.token,
      randomUUID(),
    );
    expect(offer.status).toBe(201);

    const accepted = await request(
      app,
      `/v1/offers/${offer.body.id}/accept`,
      'POST',
      undefined,
      customer.token,
      randomUUID(),
    );
    expect(accepted.status).toBe(201);
    expect(accepted.body.priceCents).toBe(2500);

    const started = await request(
      app,
      `/v1/services/${accepted.body.id}/start`,
      'POST',
      undefined,
      provider.token,
      randomUUID(),
    );
    expect(started.status).toBe(200);
    expect(started.body.status).toBe('in_progress');

    const completed = await request(
      app,
      `/v1/services/${accepted.body.id}/complete`,
      'POST',
      undefined,
      provider.token,
      randomUUID(),
    );
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('completed');
  });

  it('rejects unauthorized request creation and missing idempotency keys', async () => {
    const provider = await register('provider');
    const response = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'general' },
      provider.token,
      randomUUID(),
    );
    expect(response.status).toBe(403);

    const customer = await register('customer');
    const missingKey = await request(
      app,
      '/v1/requests',
      'POST',
      { category: 'general' },
      customer.token,
    );
    expect(missingKey.status).toBe(409);
  });
});
async function register(role: 'customer' | 'provider') {
  const email = `phase4-${role}-${randomUUID()}@example.test`;
  users.push(email);
  const response = await request(app, '/v1/auth/register', 'POST', {
    email,
    password: 'Strong-password-123',
    displayName: `Phase 4 ${role}`,
    role,
  });
  expect(response.status).toBe(201);
  return {
    accountId: response.body.accountId as string,
    token: response.body.accessToken as string,
  };
}

async function marketplace(token: string, body: unknown) {
  const response = await request(app, '/v1/me/marketplace', 'PUT', body, token);
  expect(response.status).toBe(200);
  return response;
}

async function request(
  app: INestApplication,
  path: string,
  method: string,
  body?: unknown,
  token?: string,
  idempotencyKey?: string,
) {
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server address unavailable');
  }
  const port = (address as AddressInfo).port;
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `*** } : {}),
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}
Post job cleanup.
(node:2951) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Post job cleanup.
[command]/usr/bin/git version
git version 2.55.0
Temporarily overriding HOME='/home/runner/work/_temp/e84ecaf5-5bc6-4419-b3aa-51e628196e13' before making global git config changes
Adding repository directory to the temporary git global config as a safe directory
[command]/usr/bin/git config --global --add safe.directory /home/runner/work/Nexo/Nexo
[command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
[command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
[command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
http.https://github.com/.extraheader
[command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
[command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
[command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
[command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
Print service container logs: a037d231f15344b185d930696e60e4a9_postgres17alpine_f995b0
##[command]/usr/bin/docker logs --details da9a02583d60c299663bd3280936af00810402ef045c60d0fcd9100e3bae4645
 sh: locale: not found
 The files belonging to this database system will be owned by user "postgres".
 This user must also own the server process.
 
 The database cluster will be initialized with locale "en_US.utf8".
 The default database encoding has accordingly been set to "UTF8".
 The default text search configuration will be set to "english".
 
 Data page checksums are disabled.
 
 fixing permissions on existing directory /var/lib/postgresql/data ... ok
 creating subdirectories ... ok
 selecting dynamic shared memory implementation ... posix
 selecting default "max_connections" ... 100
 selecting default "shared_buffers" ... 128MB
 selecting default time zone ... UTC
 creating configuration files ... ok
 running bootstrap script ... ok
 performing post-bootstrap initialization ... ok
 2026-10-07 08:41:15.863 UTC [34] WARNING:  no usable system locales were found
 syncing data to disk ... ok
 initdb: warning: enabling "trust" authentication for local connections
 
 initdb: hint: You can change this by editing pg_hba.conf or using the option -A, or --auth-local and --auth-host, the next time you run initdb.
 
 2026-10-07 08:41:17.318 UTC [1] LOG:  starting PostgreSQL 17.11 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit
 Success. You can now start the database server using:
 2026-10-07 08:41:17.318 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432
 
 2026-10-07 08:41:17.318 UTC [1] LOG:  listening on IPv6 address "::", port 5432
     pg_ctl -D /var/lib/postgresql/data -l logfile start
 2026-10-07 08:41:17.319 UTC [1] LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"
 2026-10-07 08:41:17.323 UTC [56] LOG:  database system was shut down at 2026-10-07 08:41:17 UTC
 2026-10-07 08:41:17.328 UTC [1] LOG:  database system is ready to accept connections
 2026-10-07 08:41:53.084 UTC [117] ERROR:  duplicate key value violates unique constraint "ratings_service_id_author_id_key"
 2026-10-07 08:41:53.084 UTC [117] DETAIL:  Key (service_id, author_id)=(84f357ca-4a39-41c8-922f-1a16cb448667, 04002956-65c8-4415-8546-2d691c69d085) already exists.
 2026-10-07 08:41:53.084 UTC [117] STATEMENT:  INSERT INTO ratings (service_id,author_id,subject_id,score,comment)
 	         VALUES ($1,$2,$3,$4,$5)
 	         RETURNING id,service_id AS "serviceId",author_id AS "authorId",subject_id AS "subjectId",
 	         score,comment,moderation_state AS "moderationState",created_at AS "createdAt"
 2026-10-07 08:41:53.137 UTC [118] ERROR:  duplicate key value violates unique constraint "ratings_service_id_author_id_key"
 2026-10-07 08:41:53.137 UTC [118] DETAIL:  Key (service_id, author_id)=(a8e1d2de-8752-4dea-bf05-82afcb1baa42, 04002956-65c8-4415-8546-2d691c69d085) already exists.
 2026-10-07 08:41:53.137 UTC [118] STATEMENT:  INSERT INTO ratings (service_id,author_id,subject_id,score,comment)
 	         VALUES ($1,$2,$3,$4,$5)
 	         RETURNING id,service_id AS "serviceId",author_id AS "authorId",subject_id AS "subjectId",
 	         score,comment,moderation_state AS "moderationState",created_at AS "createdAt"
 
 waiting for server to start....2026-10-07 08:41:16.931 UTC [40] LOG:  starting PostgreSQL 17.11 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit
 2026-10-07 08:41:16.932 UTC [40] LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"
 2026-10-07 08:41:16.935 UTC [43] LOG:  database system was shut down at 2026-10-07 08:41:16 UTC
 2026-10-07 08:41:16.940 UTC [40] LOG:  database system is ready to accept connections
  done
 server started
 CREATE DATABASE
 
 
 /usr/local/bin/docker-entrypoint.sh: ignoring /docker-entrypoint-initdb.d/*
 
 waiting for server to shut down....2026-10-07 08:41:17.095 UTC [40] LOG:  received fast shutdown request
 2026-10-07 08:41:17.095 UTC [40] LOG:  aborting any active transactions
 2026-10-07 08:41:17.100 UTC [40] LOG:  background worker "logical replication launcher" (PID 46) exited with exit code 1
 2026-10-07 08:41:17.101 UTC [41] LOG:  shutting down
 2026-10-07 08:41:17.102 UTC [41] LOG:  checkpoint starting: shutdown immediate
 2026-10-07 08:41:17.262 UTC [41] LOG:  checkpoint complete: wrote 926 buffers (5.7%); 0 WAL file(s) added, 0 removed, 0 recycled; write=0.109 s, sync=0.050 s, total=0.161 s; sync files=301, longest=0.039 s, average=0.001 s; distance=4266 kB, estimate=4266 kB; lsn=0/191E810, redo lsn=0/191E810
 2026-10-07 08:41:17.267 UTC [40] LOG:  database system is shut down
  done
 server stopped
 
 PostgreSQL init process complete; ready for start up.
 
Stop and remove container: a037d231f15344b185d930696e60e4a9_postgres17alpine_f995b0
##[command]/usr/bin/docker rm --force da9a02583d60c299663bd3280936af00810402ef045c60d0fcd9100e3bae4645
da9a02583d60c299663bd3280936af00810402ef045c60d0fcd9100e3bae4645
Remove container network: github_network_f2d7e1b59abd453ea108c4ed6c024129
##[command]/usr/bin/docker network rm github_network_f2d7e1b59abd453ea108c4ed6c024129
github_network_f2d7e1b59abd453ea108c4ed6c024129
Cleaning up orphan processes
##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
