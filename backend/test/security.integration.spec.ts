import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

let app: INestApplication;
const emails: string[] = [];

process.env.NODE_ENV='test';
process.env.AUTH_TOKEN_SECRET='01234567890123456789012345678901';
process.env.DATABASE_URL ??='postgresql://nexo:nexo@localhost:5432/nexo';

describe('operational safety integration',()=>{
 let db:Pool;
 let providerToken:string; let providerId:string; let adminToken:string; let adminId:string; let customerToken:string;
 beforeAll(async()=>{
  const ref=await Test.createTestingModule({imports:[AppModule]}).compile();
  app=ref.createNestApplication(); app.setGlobalPrefix('v1'); await app.init(); await app.listen(0,'127.0.0.1'); db=ref.get(Pool);
  const provider=await register('provider'); providerToken=provider.token; providerId=provider.id;
  const customer=await register('customer'); customerToken=customer.token;
  const admin=await register('customer'); adminId=admin.id;
  await db.query('UPDATE accounts SET role=$1 WHERE id=$2',['admin',adminId]);
  const login=await request(app,'/v1/auth/login','POST',{email:admin.email,password:'Strong-password-123'}); adminToken=login.body.accessToken as string;
 });
 afterAll(async()=>{
  if(!db)return;
  await db.query('DELETE FROM security_events WHERE actor_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM incident_cases WHERE reporter_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM fraud_flags WHERE created_by IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM verification_cases WHERE reviewed_by IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM vehicles WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])',[emails]);
  await app?.close();
 });
 it('isolates provider vehicle data and enforces provider ownership',async()=>{
  const denied=await request(app,'/v1/security/vehicles','POST',{vehicleType:'car',make:'Marca',model:'Modelo'},customerToken);
  expect(denied.status).toBe(403);
  const created=await request(app,'/v1/security/vehicles','POST',{vehicleType:'car',make:'Marca',model:'Modelo',modelYear:2024,plateLast4:'AB12'},providerToken);
  expect(created.status).toBe(201); expect(created.body.status).toBe('pending_verification');
  const mine=await request(app,'/v1/security/vehicles','GET',undefined,providerToken);
  expect(mine.status).toBe(200); const vehicleRows = mine.body as unknown as Array<{plateLast4:string}>; expect(vehicleRows[0]?.plateLast4).toBe('AB12');
 });
 it('creates private verification cases and only publishes verified indicators',async()=>{
  const vehicle=await request(app,'/v1/security/vehicles','POST',{vehicleType:'car',make:'Marca',model:'Modelo'},providerToken);
  const created=await request(app,'/v1/security/verifications','POST',{accountId:providerId,vehicleId:(vehicle.body as {id:string}).id,verificationType:'vehicle'},adminToken);
  expect(created.status).toBe(201);
  const reviewed=await request(app,`/v1/security/verifications/${created.body.id}`,'PUT',{status:'verified',resultSummary:'Validado'},adminToken);
  expect(reviewed.status).toBe(200);
  const publicView=await request(app,`/v1/profiles/${providerId}/verification`,'GET');
  expect(publicView.status).toBe(200);
  expect(publicView.body).toEqual([{verificationType:'vehicle',publicLabel:'Veículo verificado'}]);
  const forbidden=await request(app,'/v1/security/verifications','POST',{accountId:providerId,verificationType:'identity'},customerToken);
  expect(forbidden.status).toBe(403);
 });
 it('supports fraud flags and incident state transitions with moderator authorization',async()=>{
  const fraud=await request(app,'/v1/security/fraud-flags','POST',{accountId:providerId,flagType:'repeated_mismatch',severity:'high',reason:'Teste'},adminToken);
  expect(fraud.status).toBe(201);
  const fraudReview=await request(app,`/v1/security/fraud-flags/${fraud.body.id}`,'PUT',{status:'resolved',resolution:'Revisado'},adminToken);
  expect(fraudReview.status).toBe(200);
  const incident=await request(app,'/v1/security/incidents','POST',{category:'safety',severity:'high',summary:'Incidente de teste'},customerToken);
  expect(incident.status).toBe(201);
  const investigate=await request(app,`/v1/security/incidents/${incident.body.id}`,'PUT',{status:'investigating'},customerToken);
  expect(investigate.status).toBe(403);
  const resolved=await request(app,`/v1/security/incidents/${incident.body.id}`,'PUT',{status:'investigating',assignedTo:adminId},adminToken);
  expect(resolved.status).toBe(200);
  const invalid=await request(app,`/v1/security/incidents/${incident.body.id}`,'PUT',{status:'closed'},adminToken);
  expect(invalid.status).toBe(409);
  const events=await request(app,'/v1/security/events','GET',undefined,adminToken);
  expect(events.status).toBe(200);
 });
});

async function register(role:'customer'|'provider'){
 const email=`phase7-${role}-${randomUUID()}@example.test`; emails.push(email);
 const r=await request(app,'/v1/auth/register','POST',{email,password:'Strong-password-123',displayName:'Phase 7',role});
 expect(r.status,JSON.stringify(r.body)).toBe(201);
 return {id:r.body.accountId as string,token:r.body.accessToken as string,email};
}
async function request(app:INestApplication,path:string,method:string,body?:unknown,token?:string){
 const address=app.getHttpServer().address(); if(!address||typeof address==='string')throw new Error('Test server address unavailable');
 const response=await fetch(`http://127.0.0.1:${(address as AddressInfo).port}${path}`,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}: {})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json() as Record<string,unknown>};
}