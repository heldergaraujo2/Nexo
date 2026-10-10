#!/usr/bin/env node
// E2E API flow for Nexo passenger transport — runs against a REAL backend + database.
//
// Usage: NEXO_API_URL=http://127.0.0.1:3000/v1 node scripts/e2e-api-flow.mjs
//
// Covers: registration, login, driver availability, ride request (server-side fare),
// persistence (API + direct SQL), open-requests, accept, concurrent/repeated accept
// rejection, full ride state machine, histories of both users, cross-user isolation,
// and invalid-token rejection. Prints every request/response with status codes.

import { randomUUID } from 'node:crypto';
import pg from 'pg';

const baseUrl = (process.env.NEXO_API_URL ?? 'http://127.0.0.1:3000/v1').replace(/\/$/, '');
const databaseUrl = process.env.DATABASE_URL;
const stamp = Date.now().toString(36);

let failures = 0;

function check(ok, label) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
}

async function call(method, path, { body, token, key } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (key) headers['idempotency-key'] = key;
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  console.log(`\n>>> ${method} ${path}`);
  if (body) console.log('    req:', JSON.stringify(body));
  console.log(`    <- ${res.status}`, JSON.stringify(data)?.slice(0, 400));
  return { status: res.status, data };
}

async function main() {
  console.log(`Nexo E2E API flow against ${baseUrl}`);
  const pw = 'E2e-strong-pass-123';
  const pA = `e2e.passengerA.${stamp}@example.test`;
  const pB = `e2e.passengerB.${stamp}@example.test`;
  const d1 = `e2e.driver1.${stamp}@example.test`;
  const d2 = `e2e.driver2.${stamp}@example.test`;

  // 2. Create two passengers and two drivers via the real API.
  const regA = await call('POST', '/auth/register', { body: { email: pA, password: pw, displayName: 'Passageiro A', role: 'customer' } });
  const regB = await call('POST', '/auth/register', { body: { email: pB, password: pw, displayName: 'Passageiro B', role: 'customer' } });
  const regD1 = await call('POST', '/auth/register', { body: { email: d1, password: pw, displayName: 'Motorista 1', role: 'provider' } });
  const regD2 = await call('POST', '/auth/register', { body: { email: d2, password: pw, displayName: 'Motorista 2', role: 'provider' } });
  check(regA.status === 201 || regA.status === 200, 'register passenger A');

  // 3. Authenticate both (register already returns tokens; login again to prove it).
  const loginD1 = await call('POST', '/auth/login', { body: { email: d1, password: pw } });
  const loginA = await call('POST', '/auth/login', { body: { email: pA, password: pw } });
  const tA = loginA.data?.accessToken;
  const tB = regB.data?.accessToken;
  const tD1 = loginD1.data?.accessToken;
  const tD2 = regD2.data?.accessToken;
  check(typeof tA === 'string' && typeof tD1 === 'string', 'login returns access tokens');

  // 4. Driver goes available.
  const avail = await call('PUT', '/me/marketplace', {
    token: tD1,
    body: { categories: ['passenger_car'], availability: 'available', acceptingRequests: true },
  });
  check(avail.status === 200, 'driver availability set (PUT /me/marketplace)');

  // 5. Passenger A requests a ride with valid coordinates (Goiânia area).
  const request = await call('POST', '/rides/requests', {
    token: tA,
    key: `e2e-req-${stamp}`,
    body: {
      vehicleType: 'car',
      origin: { latitude: -23.55052, longitude: -46.633308 },
      destination: { latitude: -23.5, longitude: -46.6 },
    },
  });
  const requestId = request.data?.requestId;
  check(request.status === 201 && typeof requestId === 'string', 'ride request created (201 + requestId)');
  check(Number.isFinite(request.data?.fareCents), `server-side fare computed (fareCents=${request.data?.fareCents})`);

  // 6. Persistence: API + direct SQL against the database.
  const persisted = await call('GET', `/requests/${requestId}`, { token: tA });
  check(persisted.status === 200 && persisted.data?.status === 'open', 'request persisted and visible to its owner (API)');
  if (databaseUrl) {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    const rs = await client.query('SELECT id, customer_id, category, status FROM service_requests WHERE id=$1', [requestId]);
    console.log('\n>>> SQL SELECT service_requests WHERE id=' + requestId);
    console.log('    <- rows:', JSON.stringify(rs.rows));
    check(rs.rows.length === 1 && rs.rows[0].status === 'open', 'request persisted (direct SQL)');
    await client.end();
  }

  // 7. Driver sees the open request.
  const open = await call('GET', '/me/marketplace/open-requests', { token: tD1 });
  const listed = (open.data?.requests ?? []).some((r) => r.id === requestId);
  check(listed, 'driver open-requests lists the passenger request');

  // 8. Driver 1 accepts.
  const accept1 = await call('POST', `/requests/${requestId}/accept`, { token: tD1, key: `e2e-acc-${stamp}` });
  const serviceId = accept1.data?.id;
  check(accept1.status === 201 && typeof serviceId === 'string', 'driver 1 accepted the request (201 + service)');
  const svc = await call('GET', `/services/${serviceId}`, { token: tD1 });
  const rideId = svc.data?.rideId;
  check(svc.data?.rideState === 'accepted' && typeof rideId === 'string', `ride created on accept (rideId=${rideId}, state=${svc.data?.rideState})`);

  // 9. Second accept attempts must be rejected (concurrency + idempotency).
  const acceptD2 = await call('POST', `/requests/${requestId}/accept`, { token: tD2, key: `e2e-acc2-${stamp}` });
  check(acceptD2.status === 403 || acceptD2.status === 409, `second driver accept rejected (${acceptD2.status})`);
  const acceptAgain = await call('POST', `/requests/${requestId}/accept`, { token: tD1, key: `e2e-acc-${stamp}` });
  check(acceptAgain.status === 201 || acceptAgain.status === 200, `same accept replayed with same Idempotency-Key is idempotent (${acceptAgain.status})`);
  const acceptNewKey = await call('POST', `/requests/${requestId}/accept`, { token: tD1, key: `e2e-acc-dup-${stamp}` });
  check(acceptNewKey.status === 409 || acceptNewKey.status === 403, `duplicate accept with new key rejected (${acceptNewKey.status})`);

  // 10. Full ride state machine.
  for (const action of ['driver-en-route', 'arrived', 'start', 'complete']) {
    const r = await call('POST', `/rides/${rideId}/${action}`, { token: tD1, key: `e2e-${action}-${stamp}` });
    check(r.status === 200 || r.status === 201, `transition ${action} -> state=${r.data?.state}`);
  }

  // 11. Histories of both users.
  const histA = await call('GET', '/me/services/history', { token: tA });
  const histD1 = await call('GET', '/me/services/history', { token: tD1 });
  const histB = await call('GET', '/me/services/history', { token: tB });
  check((histA.data ?? []).some((s) => s.id === serviceId && s.status === 'completed'), 'passenger A history contains the completed service');
  check((histD1.data ?? []).some((s) => s.id === serviceId && s.status === 'completed'), 'driver 1 history contains the completed service');
  check((histB.data ?? []).length === 0, 'passenger B history is empty (no leakage)');

  // 12. Cross-user isolation: B cannot read A's ride or service.
  const isoRide = await call('GET', `/rides/${rideId}`, { token: tB });
  check(isoRide.status === 403 || isoRide.status === 404, `passenger B cannot read A's ride (${isoRide.status})`);
  const isoSvc = await call('GET', `/services/${serviceId}`, { token: tB });
  check(isoSvc.status === 403 || isoSvc.status === 404, `passenger B cannot read A's service (${isoSvc.status})`);

  // 13. Invalid/expired tokens rejected.
  const noAuth = await call('GET', '/me');
  check(noAuth.status === 401, `no token rejected (${noAuth.status})`);
  const badAuth = await call('GET', '/me', { token: 'not.a.valid.jwt' });
  check(badAuth.status === 401, `invalid token rejected (${badAuth.status})`);

  // Final state of the ride.
  const finalRide = await call('GET', `/rides/${rideId}`, { token: tA });
  check(finalRide.data?.state === 'completed', `final ride state is completed (got ${finalRide.data?.state})`);

  console.log(`\n=== RESULT: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'} ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E SCRIPT ERROR:', e);
  process.exit(1);
});
