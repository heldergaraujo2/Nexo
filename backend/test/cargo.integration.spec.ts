import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';

let app: INestApplication; let db: Pool; const emails:string[]=[];
process.env.NODE_ENV='test'; process.env.AUTH_TOKEN_SECRET='01234567890123456789012345678901'; process.env.DATABASE_URL ??='postgresql://nexo:nexo@localhost:5432/nexo';

describe('cargo negotiation integration',()=>{
 beforeAll(async()=>{const ref=await Test.createTestingModule({imports:[AppModule]}).compile();app=ref.createNestApplication();app.setGlobalPrefix('v1');await app.init();await app.listen(0,'127.0.0.1');db=ref.get(Pool);});
 afterAll(async()=>{
  await db.query('DELETE FROM cargo_events WHERE cargo_job_id IN (SELECT c.id FROM cargo_jobs c JOIN services s ON s.id=c.service_id WHERE s.customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',[emails]);
  await db.query('DELETE FROM cargo_jobs WHERE service_id IN (SELECT id FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',[emails]);
  await db.query('DELETE FROM cargo_proposals WHERE request_id IN (SELECT id FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',[emails]);
  await db.query('DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])',[emails]); await app?.close();
 });
 it('negotiates price with a counterproposal and executes cargo',async()=>{
  const customer=await register('customer'); const provider=await register('provider');
  await call('/v1/me/marketplace','PUT',{categories:['cargo'],availability:'available',acceptingRequests:true},provider.token);
  const req=await call('/v1/cargo/requests','POST',{origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},cargoDescription:'Caixa',weightGrams:12000,lengthMm:300,widthMm:200,heightMm:150},customer.token,randomUUID());
  expect(req.status).toBe(201);
  const first=await call('/v1/cargo/requests/'+req.body.id+'/proposals','POST',{amountCents:5000,message:'Inicial'},provider.token,randomUUID());
  expect(first.status).toBe(201); expect(first.body.version).toBe(1);
  const counter=await call('/v1/cargo/proposals/'+first.body.id+'/counter','POST',{amountCents:4200,message:'Contraproposta'},customer.token,randomUUID());
  expect(counter.status).toBe(200); expect(counter.body.version).toBe(2);
  const accepted=await call('/v1/cargo/proposals/'+counter.body.id+'/accept','POST',undefined,provider.token,randomUUID());
  expect(accepted.status).toBe(201); expect(accepted.body.priceCents).toBe(4200);
  const service=await db.query('SELECT price_cents,status FROM services WHERE id=$1',[accepted.body.id]); expect(Number(service.rows[0].price_cents)).toBe(4200);
  const cargoId=accepted.body.cargoId as string;
  for(const step of ['provider-en-route','at-pickup','picked-up','in-transit','delivered']){const out=await call('/v1/cargo/'+cargoId+'/'+step,'POST',{},provider.token,randomUUID());expect(out.status,JSON.stringify(out.body)).toBe(200);}
  const final=await call('/v1/cargo/'+cargoId,'GET',undefined,customer.token); expect(final.status).toBe(200);expect(final.body.status).toBe('delivered');
 });
 it('enforces negotiation ownership and immutable accepted price',async()=>{
  const customer=await register('customer'); const provider=await register('provider'); const outsider=await register('customer');
  await call('/v1/me/marketplace','PUT',{categories:['cargo'],availability:'available',acceptingRequests:true},provider.token);
  const req=await call('/v1/cargo/requests','POST',{origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},cargoDescription:'Carga'},customer.token,randomUUID());
  const denied=await call('/v1/cargo/requests/'+req.body.id+'/proposals','POST',{amountCents:1000},outsider.token,randomUUID()); expect(denied.status).toBe(403);
  const first=await call('/v1/cargo/requests/'+req.body.id+'/proposals','POST',{amountCents:1000},provider.token,randomUUID());
  const wrongCounter=await call('/v1/cargo/proposals/'+first.body.id+'/counter','POST',{amountCents:900},outsider.token,randomUUID()); expect(wrongCounter.status).toBe(403);
  const accepted=await call('/v1/cargo/proposals/'+first.body.id+'/accept','POST',undefined,customer.token,randomUUID()); expect(accepted.status).toBe(201);
  await expect(db.query('UPDATE services SET price_cents=1 WHERE id=$1',[accepted.body.id])).rejects.toThrow('Accepted cargo price is immutable');
 });
});

async function register(role:'customer'|'provider'){const email='phase9-'+role+'-'+randomUUID()+'@example.test';emails.push(email);const r=await call('/v1/auth/register','POST',{email,password:'Strong-password-123',displayName:'Phase 9',role});expect(r.status,JSON.stringify(r.body)).toBe(201);return {token:r.body.accessToken as string,id:r.body.accountId as string};}
async function call(path:string,method:string,body?:unknown,token?:string,key?:string){const address=app.getHttpServer().address();if(!address||typeof address==='string')throw new Error('Test server address unavailable');const r=await fetch('http://127.0.0.1:'+((address as AddressInfo).port)+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...(key?{'idempotency-key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json() as Record<string,unknown>};}