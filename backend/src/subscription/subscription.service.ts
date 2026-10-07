import { ConflictException,ForbiddenException,Inject,Injectable,NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import { BillingAdapter } from './billing.adapter';
import { CancelSubscriptionDto,CreateSubscriptionDto,SetSubscriptionStatusDto } from './dto';
const AMOUNT=9990,CURRENCY='BRL';
@Injectable()
export class SubscriptionService {
 constructor(@Inject(Pool) private readonly db:Pool,@Inject('BILLING_ADAPTER') private readonly billing:BillingAdapter){}
 async create(user:AuthPrincipal,dto:CreateSubscriptionDto){
  this.assertProvider(user); if(dto.planCode&&dto.planCode!=='professional_monthly')throw new ConflictException('Unsupported subscription plan');
  const active=await this.db.query(`SELECT id FROM subscriptions WHERE provider_id=$1 AND status IN ('pending','active','past_due','suspended')`,[user.accountId]);
  if(active.rowCount)throw new ConflictException('Provider already has an active subscription');
  const r=await this.db.query(`INSERT INTO subscriptions(provider_id,plan_code,amount_cents,currency,status,current_period_start,current_period_end) VALUES($1,'professional_monthly',$2,'BRL','pending',NOW(),NOW()+INTERVAL '1 month') RETURNING *`,[user.accountId,AMOUNT]);
  await this.audit(user.accountId,'subscription.created',r.rows[0].id,{amountCents:AMOUNT}); return this.public(r.rows[0]);
 }
 async get(user:AuthPrincipal){this.assertProvider(user);const r=await this.db.query('SELECT * FROM subscriptions WHERE provider_id=$1 ORDER BY created_at DESC LIMIT 1',[user.accountId]);return r.rows[0]?this.public(r.rows[0]):null;}
 async renew(user:AuthPrincipal,id:string,key:string){
  this.assertProvider(user);if(!key||key.length>128)throw new ConflictException('Valid Idempotency-Key is required');const c=await this.db.connect();
  try{await c.query('BEGIN');const r=await c.query('SELECT * FROM subscriptions WHERE id=$1 FOR UPDATE',[id]);const row=r.rows[0];
   if(!row)throw new NotFoundException('Subscription not found');if(row.provider_id!==user.accountId)throw new ForbiddenException('Subscription access denied');
   if(!['active','past_due','suspended'].includes(row.status))throw new ConflictException('Subscription cannot be renewed');
   const existing=await c.query('SELECT * FROM subscription_charges WHERE subscription_id=$1 AND period_start=$2 FOR UPDATE',[id,row.current_period_start]);
   if(existing.rowCount&&existing.rows[0].status==='succeeded'){await c.query('COMMIT');return this.public(row);}
   const charge=await this.billing.charge({providerId:user.accountId,subscriptionId:id,amountCents:Number(row.amount_cents),currency:row.currency,idempotencyKey:key});
   const chargeRow=await c.query(`INSERT INTO subscription_charges(subscription_id,provider_id,period_start,period_end,amount_cents,currency,status,external_reference,failure_reason,idempotency_key,paid_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $7='succeeded' THEN NOW() ELSE NULL END) ON CONFLICT(subscription_id,period_start) DO UPDATE SET status=EXCLUDED.status,external_reference=EXCLUDED.external_reference,failure_reason=EXCLUDED.failure_reason,paid_at=EXCLUDED.paid_at RETURNING id`,[id,user.accountId,row.current_period_start,row.current_period_end,row.amount_cents,row.currency,charge.status,charge.externalReference??null,charge.failureReason??null,key]);
   if(charge.status==='succeeded'){const u=await c.query(`UPDATE subscriptions SET status='active',current_period_start=current_period_end,current_period_end=current_period_end+INTERVAL '1 month',updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);await this.auditTx(c,user.accountId,'subscription.renewed',id,{chargeId:chargeRow.rows[0].id});await c.query('COMMIT');return this.public(u.rows[0]);}
   const u=await c.query(`UPDATE subscriptions SET status='past_due',updated_at=NOW() WHERE id=$1 RETURNING *`,[id]);await this.auditTx(c,user.accountId,'subscription.renewal_failed',id,{reason:charge.failureReason??null});await c.query('COMMIT');return this.public(u.rows[0]);
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async cancel(user:AuthPrincipal,id:string,dto:CancelSubscriptionDto){this.assertProvider(user);const r=await this.db.query(`UPDATE subscriptions SET status='canceled',canceled_at=NOW(),updated_at=NOW() WHERE id=$1 AND provider_id=$2 AND status IN ('pending','active','past_due','suspended') RETURNING *`,[id,user.accountId]);if(!r.rowCount)throw new ConflictException('Subscription cannot be canceled');await this.audit(user.accountId,'subscription.canceled',id,{reason:dto.reason});return this.public(r.rows[0]);}
 async setStatus(user:AuthPrincipal,id:string,dto:SetSubscriptionStatusDto){if(!['admin','moderator'].includes(user.role))throw new ForbiddenException('Moderator or admin role required');const r=await this.db.query('UPDATE subscriptions SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[dto.status,id]);if(!r.rowCount)throw new NotFoundException('Subscription not found');await this.audit(user.accountId,'subscription.status_changed',id,{status:dto.status});return this.public(r.rows[0]);}
 private public(row:Record<string,unknown>){return{id:row.id,planCode:row.plan_code,amountCents:Number(row.amount_cents),currency:row.currency,status:row.status,currentPeriodStart:row.current_period_start,currentPeriodEnd:row.current_period_end,canceledAt:row.canceled_at??null};}
 private assertProvider(user:AuthPrincipal){if(user.role!=='provider')throw new ForbiddenException('Provider role required');}
 private async audit(actor:string,type:string,id:string,metadata:Record<string,unknown>){await this.db.query(`INSERT INTO audit_events(actor_id,event_type,resource_type,resource_id,outcome,metadata) VALUES($1,$2,'subscription',$3,'success',$4)`,[actor,type,id,metadata]);}
 private async auditTx(c:import('pg').PoolClient,actor:string,type:string,id:string,metadata:Record<string,unknown>){await c.query(`INSERT INTO audit_events(actor_id,event_type,resource_type,resource_id,outcome,metadata) VALUES($1,$2,'subscription',$3,'success',$4)`,[actor,type,id,metadata]);}
}
