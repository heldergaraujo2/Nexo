import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import { BillingAdapter } from './billing.adapter';
import { CancelSubscriptionDto, CreateSubscriptionDto, SetSubscriptionStatusDto } from './dto';

const AMOUNT_CENTS = 9990;
const ACTIVE_STATUSES = ['pending', 'active', 'past_due', 'suspended'] as const;
type JsonObject = Record<string, unknown>;

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(Pool) private readonly db: Pool,
    @Inject('BILLING_ADAPTER') private readonly billing: BillingAdapter,
  ) {}

  async create(user: AuthPrincipal, dto: CreateSubscriptionDto, key: string) {
    this.assertProvider(user);
    if (dto.planCode && dto.planCode !== 'professional_monthly') {
      throw new ConflictException('Unsupported subscription plan');
    }
    return this.withIdempotency(user, 'subscription.create', key, dto, async (client) => {
      const active = await client.query(
        'SELECT id FROM subscriptions WHERE provider_id=$1 AND status = ANY($2) FOR UPDATE',
        [user.accountId, [...ACTIVE_STATUSES]],
      );
      if (active.rowCount) throw new ConflictException('Provider already has an active subscription');
      const result = await client.query(
        "INSERT INTO subscriptions (provider_id,plan_code,amount_cents,currency,status,current_period_start,current_period_end) VALUES ($1,'professional_monthly',$2,'BRL','pending',NOW(),NOW()+INTERVAL '1 month') RETURNING *",
        [user.accountId, AMOUNT_CENTS],
      );
      await this.auditTx(client, user.accountId, 'subscription.created', result.rows[0].id, { amountCents: AMOUNT_CENTS });
      return { status: 201, body: this.public(result.rows[0]) };
    });
  }

  async get(user: AuthPrincipal) {
    this.assertProvider(user);
    const result = await this.db.query(
      'SELECT * FROM subscriptions WHERE provider_id=$1 ORDER BY created_at DESC LIMIT 1',
      [user.accountId],
    );
    return result.rows[0] ? this.public(result.rows[0]) : null;
  }

  async renew(user: AuthPrincipal, id: string, key: string) {
    this.assertProvider(user);
    return this.withIdempotency(user, 'subscription.renew:' + id, key, {}, async (client) => {
      const result = await client.query('SELECT * FROM subscriptions WHERE id=$1 FOR UPDATE', [id]);
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Subscription not found');
      if (row.provider_id !== user.accountId) throw new ForbiddenException('Subscription access denied');
      if (!['pending', 'active', 'past_due'].includes(row.status)) {
        throw new ConflictException('Subscription cannot be renewed');
      }

      const charge = await this.billing.charge({
        providerId: user.accountId,
        subscriptionId: id,
        amountCents: Number(row.amount_cents),
        currency: row.currency,
        idempotencyKey: key,
      });

      const chargeResult = await client.query(
        "INSERT INTO subscription_charges (subscription_id,provider_id,period_start,period_end,amount_cents,currency,status,external_reference,failure_reason,idempotency_key,paid_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $7='succeeded' THEN NOW() ELSE NULL END) ON CONFLICT(subscription_id,period_start) DO UPDATE SET status=EXCLUDED.status,external_reference=EXCLUDED.external_reference,failure_reason=EXCLUDED.failure_reason,paid_at=EXCLUDED.paid_at RETURNING id",
        [id, user.accountId, row.current_period_start, row.current_period_end, row.amount_cents, row.currency, charge.status, charge.externalReference ?? null, charge.failureReason ?? null, key],
      );

      if (charge.status === 'succeeded') {
        const updated = await client.query(
          "UPDATE subscriptions SET status='active',current_period_start=current_period_end,current_period_end=current_period_end+INTERVAL '1 month',updated_at=NOW() WHERE id=$1 RETURNING *",
          [id],
        );
        await this.auditTx(client, user.accountId, 'subscription.renewed', id, { chargeId: chargeResult.rows[0].id });
        return { status: 200, body: this.public(updated.rows[0]) };
      }

      const updated = await client.query(
        "UPDATE subscriptions SET status='past_due',updated_at=NOW() WHERE id=$1 RETURNING *",
        [id],
      );
      await this.auditTx(client, user.accountId, 'subscription.renewal_failed', id, {
        reason: charge.failureReason ?? null,
      });
      return { status: 200, body: this.public(updated.rows[0]) };
    });
  }

  async cancel(user: AuthPrincipal, id: string, dto: CancelSubscriptionDto, key: string) {
    this.assertProvider(user);
    return this.withIdempotency(user, 'subscription.cancel:' + id, key, dto, async (client) => {
      const result = await client.query(
        "UPDATE subscriptions SET status='canceled',canceled_at=NOW(),updated_at=NOW() WHERE id=$1 AND provider_id=$2 AND status IN ('pending','active','past_due','suspended') RETURNING *",
        [id, user.accountId],
      );
      if (!result.rowCount) {
        const exists = await client.query('SELECT id FROM subscriptions WHERE id=$1', [id]);
        if (!exists.rowCount) throw new NotFoundException('Subscription not found');
        throw new ConflictException('Subscription cannot be canceled');
      }
      await this.auditTx(client, user.accountId, 'subscription.canceled', id, { reason: dto.reason });
      return { status: 200, body: this.public(result.rows[0]) };
    });
  }

  async setStatus(user: AuthPrincipal, id: string, dto: SetSubscriptionStatusDto, key: string) {
    if (!['admin', 'moderator'].includes(user.role)) {
      throw new ForbiddenException('Moderator or admin role required');
    }
    return this.withIdempotency(user, 'subscription.status:' + id, key, dto, async (client) => {
      const result = await client.query(
        'UPDATE subscriptions SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',
        [dto.status, id],
      );
      if (!result.rowCount) throw new NotFoundException('Subscription not found');
      await this.auditTx(client, user.accountId, 'subscription.status_changed', id, { status: dto.status });
      return { status: 200, body: this.public(result.rows[0]) };
    });
  }

  async history(user: AuthPrincipal, id: string) {
    this.assertProvider(user);
    const subscription = await this.db.query('SELECT provider_id FROM subscriptions WHERE id=$1', [id]);
    if (!subscription.rowCount) throw new NotFoundException('Subscription not found');
    if (subscription.rows[0].provider_id !== user.accountId) throw new ForbiddenException('Subscription access denied');
    const charges = await this.db.query(
      'SELECT id,period_start AS "periodStart",period_end AS "periodEnd",amount_cents AS "amountCents",currency,status,external_reference AS "externalReference",failure_reason AS "failureReason",created_at AS "createdAt",paid_at AS "paidAt" FROM subscription_charges WHERE subscription_id=$1 ORDER BY period_start DESC',
      [id],
    );
    return charges.rows.map((row) => ({ ...row, amountCents: Number(row.amountCents) }));
  }

  private public(row: Record<string, unknown>) {
    return {
      id: row.id,
      planCode: row.plan_code,
      amountCents: Number(row.amount_cents),
      currency: row.currency,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      canceledAt: row.canceled_at ?? null,
    };
  }

  private assertProvider(user: AuthPrincipal) {
    if (user.role !== 'provider') throw new ForbiddenException('Provider role required');
  }

  private async auditTx(client: PoolClient, actor: string, type: string, id: string, metadata: JsonObject) {
    await client.query(
      "INSERT INTO audit_events(actor_id,event_type,resource_type,resource_id,outcome,metadata) VALUES($1,$2,'subscription',$3,'success',$4)",
      [actor, type, id, metadata],
    );
  }

  private async withIdempotency(
    user: AuthPrincipal,
    operation: string,
    key: string,
    payload: unknown,
    work: (client: PoolClient) => Promise<{ status: number; body: JsonObject }>,
  ) {
    if (!key || key.length > 128) throw new ConflictException('Valid Idempotency-Key is required');
    const requestHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        user.accountId + ':' + operation + ':' + key,
      ]);
      const existing = await client.query(
        'SELECT request_hash AS "requestHash",response_status AS "responseStatus",response_body AS "responseBody" FROM idempotency_keys WHERE account_id=$1 AND idempotency_key=$2 AND operation=$3 FOR UPDATE',
        [user.accountId, key, operation],
      );
      if (existing.rowCount) {
        const row = existing.rows[0];
        if (row.requestHash !== requestHash) {
          throw new ConflictException('Idempotency-Key was already used with a different payload');
        }
        await client.query('COMMIT');
        return { status: row.responseStatus, body: row.responseBody };
      }
      const result = await work(client);
      await client.query(
        'INSERT INTO idempotency_keys(account_id,idempotency_key,operation,request_hash,response_status,response_body) VALUES($1,$2,$3,$4,$5,$6)',
        [user.accountId, key, operation, requestHash, result.status, result.body],
      );
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
