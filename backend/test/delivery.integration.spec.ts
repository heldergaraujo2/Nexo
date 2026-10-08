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

describe('delivery integration',()=>{
 let db:Pool; beforeAll(async()=>{
  const ref=await Test.createTestingModule({imports:[AppModule]}).compile();
  app=ref.createNestApplication(); app.setGlobalPrefix('v1'); await app.init(); await app.listen(0,'127.0.0.1'); db=ref.get(Pool);
 });
 afterAll(async()=>{
  if(!db)return;
  await db.query('DELETE FROM delivery_events WHERE delivery_id IN (SELECT d.id FROM deliveries d JOIN services s ON s.id=d.service_id JOIN accounts a ON a.id=s.customer_id WHERE a.email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM deliveries WHERE service_id IN (SELECT id FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])))',[emails]);
  await db.query('DELETE FROM idempotency_keys WHERE account_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM audit_events WHERE actor_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM services WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[])) OR provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM service_requests WHERE customer_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM subscription_charges WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM subscriptions WHERE provider_id IN (SELECT id FROM accounts WHERE email=ANY($1::text[]))',[emails]);
  await db.query('DELETE FROM accounts WHERE email=ANY($1::text[])',[emails]);
  await app?.close();
 });
 it('creates a delivery request with item, route, notes and media metadata',async()=>{
  const customer=await register('customer');
  const request=await call('/v1/deliveries/requests','POST',{
   origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},
   itemDescription:'Documentos',notes:'Não dobrar',
   media:[{objectKey:'delivery/test.jpg',mimeType:'image/jpeg',byteSize:1200,checksumSha256:'a'.repeat(64),caption:'Pacote'}],
  },customer.token,randomUUID());
  expect(request.status).toBe(201); expect(request.body.category).toBe('delivery'); const requirements=request.body.requirements as {media:unknown[]}; expect(requirements.media).toHaveLength(1);
 });
 it('requires a priced offer for delivery acceptance',async()=>{
  const customer=await register('customer'); const provider=await register('provider');
  await activateSubscription(provider.token);
  await call('/v1/me/marketplace','PUT',{categories:['delivery'],availability:'available',acceptingRequests:true},provider.token);
  const created=await call('/v1/deliveries/requests','POST',{origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},itemDescription:'Pacote'},customer.token,randomUUID());
  const direct=await call('/v1/requests/'+created.body.id+'/accept','POST',undefined,provider.token,randomUUID());
  expect(direct.status).toBe(409);
  const offer=await call('/v1/requests/'+created.body.id+'/offers','POST',{offerType:'priced_offer',amountCents:2500},provider.token,randomUUID());
  expect(offer.status).toBe(201);
  const accepted=await call('/v1/offers/'+offer.body.id+'/accept','POST',undefined,customer.token,randomUUID());
  expect(accepted.status).toBe(201); expect(accepted.body.priceCents).toBe(2500);
 });
 it('accepts delivery through marketplace and executes the delivery state machine',async()=>{
  const customer=await register('customer');
  const provider=await register('provider');
  await activateSubscription(provider.token);
  await call('/v1/me/marketplace','PUT',{categories:['delivery'],availability:'available',acceptingRequests:true},provider.token);
  const created=await call('/v1/deliveries/requests','POST',{origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},itemDescription:'Pequeno pacote'},customer.token,randomUUID());
  expect(created.status).toBe(201);
  const offer=await call('/v1/requests/'+created.body.id+'/offers','POST',{offerType:'priced_offer',amountCents:2500},provider.token,randomUUID());
  expect(offer.status).toBe(201);
  const accepted=await call('/v1/offers/'+offer.body.id+'/accept','POST',undefined,customer.token,randomUUID());
  expect(accepted.status).toBe(201);
  const delivery=await db.query('SELECT id FROM deliveries WHERE service_id=$1',[accepted.body.id]);
  expect(delivery.rowCount).toBe(1);
  const deliveryId=delivery.rows[0].id as string;
  for(const step of ['provider-en-route','at-pickup','picked-up','in-transit','delivered']){
   const response=await call('/v1/deliveries/'+deliveryId+'/'+step,'POST',{},provider.token,randomUUID());
   expect(response.status,JSON.stringify(response.body)).toBe(200);
  }
  const final=await call('/v1/deliveries/'+deliveryId,'GET',undefined,customer.token);
  expect(final.status).toBe(200); expect(final.body.status).toBe('delivered');
  const service=await db.query('SELECT status FROM services WHERE id=$1',[accepted.body.id]);
  expect(service.rows[0].status).toBe('completed');
 });
 it('rejects invalid transitions and unauthorized access',async()=>{
  const customer=await register('customer'); const provider=await register('provider'); const outsider=await register('customer');
  await call('/v1/me/marketplace','PUT',{categories:['delivery'],availability:'available',acceptingRequests:true},provider.token);
  const created=await call('/v1/deliveries/requests','POST',{origin:{latitude:-16.68,longitude:-49.25},destination:{latitude:-16.69,longitude:-49.24},itemDescription:'Pacote'},customer.token,randomUUID());
  const offer=await call('/v1/requests/'+created.body.id+'/offers','POST',{offerType:'priced_offer',amountCents:2500},provider.token,randomUUID());
  const accepted=await call('/v1/offers/'+offer.body.id+'/accept','POST',undefined,customer.token,randomUUID());
  const delivery=(await db.query('SELECT id FROM deliveries WHERE service_id=$1',[accepted.body.id])).rows[0].id as string;
  const forbidden=await call('/v1/deliveries/'+delivery,'GET',undefined,outsider.token);
  expect(forbidden.status).toBe(403);
  const invalid=await call('/v1/deliveries/'+delivery+'/delivered','POST',{},provider.token,randomUUID());
  expect(invalid.status).toBe(409);
 });
});

async function activateSubscription(token:string){
 const created=await call('/v1/subscriptions','POST',{},token,randomUUID());
 expect(created.status,JSON.stringify(created.body)).toBe(201);
 const renewed=await call('/v1/subscriptions/'+created.body.id+'/renew','POST',undefined,token,randomUUID());
 expect(renewed.status,JSON.stringify(renewed.body)).toBe(200);
}

async function register(role:'customer'|'provider'){
 const email=`phase8-${role}-${randomUUID()}@example.test`; emails.push(email);
 const response=await call('/v1/auth/register','POST',{email,password:'Strong-password-123',displayName:'Phase 8',role});
 expect(response.status,JSON.stringify(response.body)).toBe(201);
 return {token:response.body.accessToken as string,id:response.body.accountId as string};
}
async function call(path:string,method:string,body?:unknown,token?:string,key?:string){
 const address=app.getHttpServer().address(); if(!address||typeof address==='string')throw new Error('Test server address unavailable');
 const response=await fetch(`http://127.0.0.1:${(address as AddressInfo).port}${path}`,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{}),...(key?{'idempotency-key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json() as Record<string,unknown>};
}