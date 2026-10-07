import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

process.env.NODE_ENV='test';
process.env.AUTH_TOKEN_SECRET='01234567890123456789012345678901';
process.env.DATABASE_URL ??='postgresql://nexo:nexo@localhost:5432/nexo';

let app: INestApplication;
let db: Pool;
const emails:string[]=[];

describe('cargo negotiation integration',()=>{
 beforeAll(async()=>{const ref=await Test.createTestingModule({imports:[AppModule]}).compile();app=ref.createNestApplication();app.setGlobalPrefix('v1');await app.init();await app.listen(0,'127.0.0.1');db=ref.get(Pool);});
 afterAll(async()=>{
  if(!db)return;
  await db.query('DELETE FROM cargo_events WHERE cargo_job_id IN (SELECT c.id FROM cargo_jobs c JOIN services s ON s.id=c.service_id JOIN accounts a ON a.id=s.customer_id WHERE a.email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM cargo_jobs WHERE service_id IN (SELECT id FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',[emails]);
  await db.query('DELETE FROM cargo_proposals WHERE request_id IN (SELECT id FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',[emails]);
  await db.query('DELETE FROM offers WHERE request_id IN (SELECT id FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',[emails]);
  await db.query('DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])',[emails]);
  await app?.close();
 });
 it('negotiates provider proposal, customer counteroffer, and acceptance with immutable price',async()=>{
  const customer=await register('customer'); const provider=await register('provider');
  await call('/v1/me/marketplace','PUT',{categories:['cargo'],availability:'available',acceptingRequests:true},provider.token);
  const created=await call('/v1/cargo/requests','POST',{origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},cargoDescription:'Caixa frágil',weightGrams:2500,lengthMm:300,widthMm:200,heightMm:150},customer.token,randomUUID());
  expect(created.status,JSON.stringify(created.body)).toBe(201);
  const proposal=await call('/v1/cargo/requests/'+created.body.id+'/proposals','POST',{amountCents:4200,message:'Valor inicial'},provider.token,randomUUID());
  expect(proposal.status,JSON.stringify(proposal.body)).toBe(201);
  const counter=await call('/v1/cargo/proposals/'+proposal.body.id+'/counter','POST',{amountCents:4000},customer.token,randomUUID());
  expect(counter.status,JSON.stringify(counter.body)).toBe(200);
  const accepted=await call('/v1/cargo/proposals/'+counter.body.id+'/accept','POST',undefined,provider.token,randomUUID());
  expect(accepted.status,JSON.stringify(accepted.body)).toBe(201);
  expect(accepted.body.priceCents).toBe(4000);
  const service=await db.query('SELECT id,customer_id,provider_id,price_cents,status FROM services WHERE id=$1',[accepted.body.id]);
  expect(service.rows[0].customer_id).toBe(customer.id);
  expect(service.rows[0].provider_id).toBe(provider.id);
  expect(Number(service.rows[0].price_cents)).toBe(4000);
  await expect(db.query('UPDATE services SET price_cents=4500 WHERE id=$1',[accepted.body.id])).rejects.toThrow('Accepted cargo price is immutable');
 });
 it('executes cargo lifecycle and enforces authorization',async()=>{
  const customer=await register('customer'); const provider=await register('provider'); const outsider=await register('customer');
  await call('/v1/me/marketplace','PUT',{categories:['cargo'],availability:'available',acceptingRequests:true},provider.token);
  const created=await call('/v1/cargo/requests','POST',{origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},cargoDescription:'Pacote'},customer.token,randomUUID());
  const proposal=await call('/v1/cargo/requests/'+created.body.id+'/proposals','POST',{amountCents:2500},provider.token,randomUUID());
  const accepted=await call('/v1/cargo/proposals/'+proposal.body.id+'/accept','POST',undefined,customer.token,randomUUID());
  expect(accepted.status,JSON.stringify(accepted.body)).toBe(201);
  const cargo=(await db.query('SELECT id FROM cargo_jobs WHERE service_id=$1',[accepted.body.id])).rows[0].id as string;
  expect((await call('/v1/cargo/'+cargo,'GET',undefined,outsider.token)).status).toBe(403);
  for(const step of ['provider-en-route','at-pickup','picked-up','in-transit','delivered']){
   const response=await call('/v1/cargo/'+cargo+'/'+step,'POST',{},provider.token,randomUUID());
   expect(response.status,JSON.stringify(response.body)).toBe(200);
  }
  const final=await call('/v1/cargo/'+cargo,'GET',undefined,customer.token);
  expect(final.status).toBe(200); expect(final.body.status).toBe('delivered');
 });
 it('prevents passenger categories from using cargo negotiation endpoint',async()=>{
  const customer=await register('customer');
  const request=await db.query("INSERT INTO service_requests (customer_id,category,status) VALUES ($1,'passenger_car','open') RETURNING id",[customer.id]);
  const provider=await register('provider');
  await call('/v1/me/marketplace','PUT',{categories:['cargo'],availability:'available',acceptingRequests:true},provider.token);
  const response=await call('/v1/cargo/requests/'+request.rows[0].id+'/proposals','POST',{amountCents:1000},provider.token,randomUUID());
  expect(response.status).toBe(409);
 });
});

async function register(role:'customer'|'provider'){
 const email='phase9-'+role+'-'+randomUUID()+'@example.test';emails.push(email);
 const response=await call('/v1/auth/register','POST',{email,password:'Strong-password-123',displayName:'Phase 9',role});
 expect(response.status,JSON.stringify(response.body)).toBe(201);
 return {id:response.body.accountId as string,token:response.body.accessToken as string};
}
async function call(path:string,method:string,body?:unknown,token?:string,key?:string){
 const address=app.getHttpServer().address();if(!address||typeof address==='string')throw new Error('Test server address unavailable');
 const response=await fetch('http://127.0.0.1:'+(address as AddressInfo).port+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...(key?{'idempotency-key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json() as Record<string,unknown>};
}
