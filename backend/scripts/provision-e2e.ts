import { randomUUID } from 'node:crypto';

const baseUrl = (process.env.NEXO_API_URL ?? 'http://127.0.0.1:3000/v1').replace(/\/$/, '');
const driverEmail = process.env.NEXO_E2E_DRIVER_EMAIL ?? 'nexo.e2e.driver@example.test';
const passengerEmail = process.env.NEXO_E2E_PASSENGER_EMAIL ?? 'nexo.e2e.passenger@example.test';
const driverPassword = process.env.NEXO_E2E_DRIVER_PASSWORD;
const passengerPassword = process.env.NEXO_E2E_PASSENGER_PASSWORD;

if (!driverPassword || !passengerPassword) {
  throw new Error('Set NEXO_E2E_DRIVER_PASSWORD and NEXO_E2E_PASSENGER_PASSWORD before provisioning.');
}

async function call(path: string, method: string, body?: unknown, token?: string) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'idempotency-key': randomUUID(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${raw}`);
  return data as Record<string, unknown>;
}

async function registerOrLogin(email: string, password: string, role: 'provider' | 'customer', displayName: string) {
  try {
    return await call('/auth/register', 'POST', { email, password, role, displayName });
  } catch (error) {
    if (!String(error).includes('409')) throw error;
    return await call('/auth/login', 'POST', { email, password });
  }
}

const driver = await registerOrLogin(driverEmail, driverPassword, 'provider', 'Nexo Motorista Teste');
const passenger = await registerOrLogin(passengerEmail, passengerPassword, 'customer', 'Nexo Passageiro Teste');

await call('/me/profile', 'PUT', {
  displayName: 'Nexo Motorista Teste',
  bio: 'Perfil fictício para validação operacional.',
  professionalInfo: 'Motorista de teste Nexo.',
  photoUrl: 'https://placehold.co/256x256/png?text=Nexo+Driver',
}, driver.accessToken as string);

await call('/me/profile', 'PUT', {
  displayName: 'Nexo Passageiro Teste',
  bio: 'Perfil fictício para validação operacional.',
  photoUrl: 'https://placehold.co/256x256/png?text=Nexo+Passenger',
}, passenger.accessToken as string);

const vehicle = await call('/security/vehicles', 'POST', {
  vehicleType: 'car',
  make: 'Nexo Test',
  model: 'Carro Fictício',
  modelYear: 2026,
  plateLast4: 'E2E1',
}, driver.accessToken as string);

await call('/me/marketplace', 'PUT', {
  categories: ['passenger_car'],
  availability: 'available',
  acceptingRequests: true,
}, driver.accessToken as string);

console.log(JSON.stringify({
  driver: { email: driverEmail, role: driver.role, accountId: driver.accountId, vehicleId: vehicle.id, vehicleStatus: vehicle.status },
  passenger: { email: passengerEmail, role: passenger.role, accountId: passenger.accountId },
}, null, 2));
