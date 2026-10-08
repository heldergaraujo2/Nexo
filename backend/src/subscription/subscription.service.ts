import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import { BillingAdapter } from './billing.adapter';
import {
  CancelSubscriptionDto,
  CreateSubscriptionDto,
  SetSubscriptionStatusDto,
} from './dto';

const AMOUNT_CENTS = 9990;
const ACTIVE = ['pending', 'active', 'past_due', 'suspended'];

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(Pool) private readonly db: Pool,
    @Inject('BILLING_ADAPTER') private readonly billing: BillingAdapter,
  ) {}
  async create(user: AuthPrincipal, dto: CreateSubscriptionDto, key: string) {
    this.assertProvider(user);
    if (dto.planCode && dto.planCode !== 'professional_monthly')
      throw new ConflictException('Unsupported subscription plan');
    return this.idempotent(user, 'subscription.create', key, dto, async (c) => {
      const active = await c.query(
        'SELECT id FROM subscriptions WHERE provider_id=$1 AND status=ANY($2) FOR UPDATE',
        [user.accountId, ACTIVE],
      );
      if (active.rowCount)
        throw new ConflictException(
          'Provider already has an active subscription',
        );
      const r = await c.query(
        "INSERT INTO subscriptions(provider_id,plan_code,amount_cents,currency,status,current_period_start,current_period_end) VALUES($1,'professional_monthly',$2,'BRL','pending',NOW(),NOW()+INTERVAL '1 month') RETURNING *",
        [user.accountId, AMOUNT_CENTS],
      );
      await this.audit(
        c,
        user.accountId,
        'subscription.created',
        r.rows[0].id,
        { amountCents: AMOUNT_CENTS },
      );
      return { status: 201, body: this.public(r.rows[0]) };
    });
  }
  async get(user: AuthPrincipal) {
    this.assertProvider(user);
    const r = await this.db.query(
      'SELECT * FROM subscriptions WHERE provider_id=$1 ORDER BY created_at DESC LIMIT 1',
      [user.accountId],
    );
    return r.rows[0] ? this.public(r.rows[0]) : null;
  }
  async renew(user: AuthPrincipal, id: string, key: string) {
    this.assertProvider(user);
    return this.idempotent(
      user,
      'subscription.renew:' + id,
      key,
      {},
      async (c) => {
        const r = await c.query(
          'SELECT * FROM subscriptions WHERE id=$1 FOR UPDATE',
          [id],
        );
        const s = r.rows[0];
        if (!s) throw new NotFoundException('Subscription not found');
        if (s.provider_id !== user.accountId)
          throw new ForbiddenException('Subscription access denied');
        if (!['pending', 'active', 'past_due'].includes(s.status))
          throw new ConflictException('Subscription cannot be renewed');
        const charge = await this.billing.charge({
          providerId: user.accountId,
          subscriptionId: id,
          amountCents: Number(s.amount_cents),
          currency: s.currency,
          idempotencyKey: key,
        });
        await c.query(
          "INSERT INTO subscription_charges(subscription_id,provider_id,period_start,period_end,amount_cents,currency,status,external_reference,failure_reason,idempotency_key,paid_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $7='succeeded' THEN NOW() ELSE NULL END) ON CONFLICT(subscription_id,period_start) DO UPDATE SET status=EXCLUDED.status,external_reference=EXCLUDED.external_reference,failure_reason=EXCLUDED.failure_reason,paid_at=EXCLUDED.paid_at",
          [
            id,
            user.accountId,
            s.current_period_start,
            s.current_period_end,
            s.amount_cents,
            s.currency,
            charge.status,
            charge.externalReference ?? null,
            charge.failureReason ?? null,
            key,
          ],
        );
        const status = charge.status === 'succeeded' ? 'active' : 'past_due';
        const u = await c.query(
          "UPDATE subscriptions SET status=$1,current_period_start=CASE WHEN $1='active' THEN current_period_end ELSE current_period_start END,current_period_end=CASE WHEN $1='active' THEN current_period_end+INTERVAL '1 month' ELSE current_period_end END,updated_at=NOW() WHERE id=$2 RETURNING *",
          [status, id],
        );
        await this.audit(c, user.accountId, 'subscription.renewed', id, {
          status,
        });
        return { status: 200, body: this.public(u.rows[0]) };
      },
    );
  }
  async cancel(
    user: AuthPrincipal,
    id: string,
    dto: CancelSubscriptionDto,
    key: string,
  ) {
    this.assertProvider(user);
    return this.idempotent(
      user,
      'subscription.cancel:' + id,
      key,
      dto,
      async (c) => {
        const r = await c.query(
          "UPDATE subscriptions SET status='canceled',canceled_at=NOW(),updated_at=NOW() WHERE id=$1 AND provider_id=$2 AND status=ANY($3) RETURNING *",
          [id, user.accountId, ACTIVE],
        );
        if (!r.rowCount) {
          const e = await c.query('SELECT id FROM subscriptions WHERE id=$1', [
            id,
          ]);
          if (!e.rowCount)
            throw new NotFoundException('Subscription not found');
          throw new ConflictException('Subscription cannot be canceled');
        }
        await this.audit(c, user.accountId, 'subscription.canceled', id, {
          reason: dto.reason,
        });
        return { status: 200, body: this.public(r.rows[0]) };
      },
    );
  }
  async setStatus(
    user: AuthPrincipal,
    id: string,
    dto: SetSubscriptionStatusDto,
    key: string,
  ) {
    if (!['admin', 'moderator'].includes(user.role))
      throw new ForbiddenException('Moderator or admin role required');
    return this.idempotent(
      user,
      'subscription.status:' + id,
      key,
      dto,
      async (c) => {
        const r = await c.query(
          'UPDATE subscriptions SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',
          [dto.status, id],
        );
        if (!r.rowCount)
          throw new NotFoundException('Subscription not found');
        await this.audit(c, user.accountId, 'subscription.status_changed', id, {
          status: dto.status,
        });
        return { status: 200, body: this.public(r.rows[0]) };
      },
    );
  }
  async history(user: AuthPrincipal, id: string) {
    this.assertProvider(user);
    const s = await this.db.query(
      'SELECT provider_id FROM subscriptions WHERE id=$1',
      [id],
    );
    if (!s.rowCount) throw new NotFoundException('Subscription not found');
    if (s.rows[0].provider_id !== user.accountId)
      throw new ForbiddenException('Subscription access denied');
    const r = await this.db.query(
      'SELECT id,period_start AS "periodStart",period_end AS "periodEnd",amount_cents AS "amountCents",currency,status,external_reference AS "externalReference",failure_reason AS "failureReason",created_at AS "createdAt",paid_at AS "paidAt" FROM subscription_charges WHERE subscription_id=$1 ORDER BY period_start DESC',
      [id],
    );
    return r.rows.map((x) => ({ ...x, amountCents: Number(x.amountCents) }));
  }
  private public(r: Record<string, any>) {
    return {
      id: r.id,
      planCode: r.plan_code,
      amountCents: Number(r.amount_cents),
      currency: r.currency,
      status: r.status,
      currentPeriodStart: r.current_period_start,
      currentPeriodEnd: r.current_period_end,
      canceledAt: r.canceled_at ?? null,
    };
  }
  private assertProvider(u: AuthPrincipal) {
    if (u.role !== 'provider')
      throw new ForbiddenException('Provider role required');
  }
  private async audit(
    c: PoolClient,
    actor: string,
    type: string,
    id: string,
    metadata: Record<string, unknown>,
  ) {
    await c.query(
      "INSERT INTO audit_events(actor_id,event_type,resource_type,resource_id,outcome,metadata) VALUES($1,$2,'subscription',$3,'success',$4)",
      [actor, type, id, metadata],
    );
  }
  private async idempotent(
    u: AuthPrincipal,
    op: string,
    key: string,
    payload: unknown,
    work: (
      c: PoolClient,
    ) => Promise<{ status: number; body: Record<string, unknown> }>,
  ) {
    if (!key || key.length > 128)
      throw new ConflictException('Valid Idempotency-Key is required');
    const hash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const c = await this.db.connect();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        u.accountId + ':' + op,
      ]);
      const e = await c.query(
        'SELECT request_hash AS "requestHash",response_status AS "responseStatus",response_body AS "responseBody" FROM idempotency_keys WHERE account_id=$1 AND idempotency_key=$2 AND operation=$3 FOR UPDATE',
        [u.accountId, key, op],
      );
      if (e.rowCount) {
        if (e.rows[0].requestHash !== hash)
          throw new ConflictException(
            'Idempotency-Key was already used with a different payload',
          );
        await c.query('COMMIT');
        return {
          status: e.rows[0].responseStatus,
          body: e.rows[0].responseBody,
        };
      }
      const out = await work(c);
      await c.query(
        'INSERT INTO idempotency_keys(account_id,idempotency_key,operation,request_hash,response_status,response_body) VALUES($1,$2,$3,$4,$5,$6)',
        [u.accountId, key, op, hash, out.status, out.body],
      );
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
}
