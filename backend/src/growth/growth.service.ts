import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import { ClaimReferralDto, CreateCampaignDto, MetricsRangeDto, RedeemCampaignDto } from './dto';

@Injectable()
export class GrowthService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async referralCode(user: AuthPrincipal) {
    const code = 'NXO-' + createHash('sha256').update(user.accountId).digest('hex').slice(0, 10).toUpperCase();
    await this.db.query('INSERT INTO referral_codes(account_id,code) VALUES($1,$2) ON CONFLICT(account_id) DO NOTHING', [user.accountId, code]);
    return { code };
  }

  async claimReferral(user: AuthPrincipal, dto: ClaimReferralDto, key: string) {
    return this.idempotent(user, 'growth.referral.claim', key, dto, async (client) => {
      const code = await client.query('SELECT account_id FROM referral_codes WHERE code=$1', [dto.code.trim().toUpperCase()]);
      if (!code.rowCount) throw new NotFoundException('Referral code not found');
      if (code.rows[0].account_id === user.accountId) throw new ConflictException('Self-referral is not allowed');
      const existing = await client.query('SELECT id FROM referrals WHERE referred_id=$1', [user.accountId]);
      if (existing.rowCount) throw new ConflictException('Referral already claimed');
      const result = await client.query('INSERT INTO referrals(referral_code,referrer_id,referred_id) VALUES($1,$2,$3) RETURNING id,status,created_at AS "createdAt"', [dto.code.trim().toUpperCase(), code.rows[0].account_id, user.accountId]);
      await this.audit(client, user.accountId, 'growth.referral.claimed', result.rows[0].id);
      return { status: 201, body: result.rows[0] };
    });
  }

  async campaigns() {
    const result = await this.db.query('SELECT id,code,name,status,starts_at AS "startsAt",ends_at AS "endsAt" FROM campaigns WHERE status=$1 AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW()) ORDER BY created_at DESC', ['active']);
    return result.rows;
  }

  async redeemCampaign(user: AuthPrincipal, dto: RedeemCampaignDto, key: string) {
    return this.idempotent(user, 'growth.campaign.redeem', key, dto, async (client) => {
      const campaign = await client.query('SELECT id,code FROM campaigns WHERE code=$1 AND status=$2 AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW()) FOR UPDATE', [dto.code.trim().toUpperCase(), 'active']);
      if (!campaign.rowCount) throw new NotFoundException('Campaign not found or inactive');
      try {
        await client.query('INSERT INTO campaign_redemptions(campaign_id,account_id) VALUES($1,$2)', [campaign.rows[0].id, user.accountId]);
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('Campaign already redeemed');
        throw error;
      }
      await this.audit(client, user.accountId, 'growth.campaign.redeemed', campaign.rows[0].id);
      return { status: 201, body: { campaignId: campaign.rows[0].id, code: campaign.rows[0].code } };
    });
  }

  async enrollFounder(user: AuthPrincipal, key: string) {
    return this.idempotent(user, 'growth.founder.enroll', key, {}, async (client) => {
      const result = await client.query('INSERT INTO founder_program(account_id) VALUES($1) ON CONFLICT(account_id) DO UPDATE SET account_id=EXCLUDED.account_id RETURNING account_id AS "accountId",cohort,enrolled_at AS "enrolledAt"', [user.accountId]);
      await this.audit(client, user.accountId, 'growth.founder.enrolled', user.accountId);
      return { status: 201, body: result.rows[0] };
    });
  }

  async recurringCustomers(user: AuthPrincipal) {
    if (user.role === 'provider') {
      const result = await this.db.query('SELECT s.customer_id AS "customerId",p.display_name AS "displayName",COUNT(*)::int AS "completedServices",MAX(s.completed_at) AS "lastCompletedAt" FROM services s JOIN profiles p ON p.account_id=s.customer_id WHERE s.provider_id=$1 AND s.status=$2 GROUP BY s.customer_id,p.display_name HAVING COUNT(*)>=2 ORDER BY COUNT(*) DESC,MAX(s.completed_at) DESC', [user.accountId, 'completed']);
      return result.rows;
    }
    const result = await this.db.query('SELECT COUNT(*)::int AS "completedServices",(COUNT(*) >= 2) AS "isRecurring",MAX(completed_at) AS "lastCompletedAt" FROM services WHERE customer_id=$1 AND status=$2', [user.accountId, 'completed']);
    return result.rows[0];
  }

  async acquisitionMetrics(q: MetricsRangeDto) {
    const { from, to } = this.range(q);
    const accounts = await this.db.query('SELECT role,COUNT(*)::int AS "newAccounts" FROM accounts WHERE created_at >= $1 AND created_at < $2 GROUP BY role ORDER BY role', [from, to]);
    const referrals = await this.db.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='qualified')::int AS qualified FROM referrals WHERE created_at >= $1 AND created_at < $2", [from, to]);
    const campaigns = await this.db.query('SELECT COUNT(*)::int AS redemptions FROM campaign_redemptions WHERE redeemed_at >= $1 AND redeemed_at < $2', [from, to]);
    return { from, to, newAccounts: accounts.rows, referrals: referrals.rows[0], campaignRedemptions: campaigns.rows[0].redemptions };
  }

  async supplyDemandMetrics(q: MetricsRangeDto) {
    const { from, to } = this.range(q);
    const requests = await this.db.query('SELECT category,COUNT(*)::int AS requests FROM service_requests WHERE created_at >= $1 AND created_at < $2 GROUP BY category ORDER BY category', [from, to]);
    const providers = await this.db.query("SELECT availability,COUNT(*)::int AS providers FROM provider_marketplace WHERE availability IN ('available','busy') GROUP BY availability");
    const offers = await this.db.query("SELECT COUNT(*)::int AS offers FROM offers WHERE created_at >= $1 AND created_at < $2 AND status IN ('sent','accepted','rejected','expired','withdrawn')", [from, to]);
    return { from, to, requestsByCategory: requests.rows, onlineProviders: providers.rows, offers: offers.rows[0].offers };
  }

  async conversionMetrics(q: MetricsRangeDto) {
    const { from, to } = this.range(q);
    const [requests, offered, accepted, completed] = await Promise.all([
      this.db.query('SELECT COUNT(*)::int AS count FROM service_requests WHERE created_at >= $1 AND created_at < $2', [from, to]),
      this.db.query('SELECT COUNT(DISTINCT request_id)::int AS count FROM offers WHERE created_at >= $1 AND created_at < $2', [from, to]),
      this.db.query("SELECT COUNT(*)::int AS count FROM services WHERE created_at >= $1 AND created_at < $2 AND status IN ('accepted','in_progress','completed')", [from, to]),
      this.db.query("SELECT COUNT(*)::int AS count FROM services WHERE created_at >= $1 AND created_at < $2 AND status='completed'", [from, to]),
    ]);
    const requestCount = requests.rows[0].count;
    const offeredCount = offered.rows[0].count;
    const acceptedCount = accepted.rows[0].count;
    const completedCount = completed.rows[0].count;
    return { from, to, requests: requestCount, requestsWithOffers: offeredCount, acceptedServices: acceptedCount, completedServices: completedCount, offerRate: requestCount ? offeredCount / requestCount : 0, acceptanceRate: offeredCount ? acceptedCount / offeredCount : 0, completionRate: acceptedCount ? completedCount / acceptedCount : 0 };
  }

  async retentionMetrics(q: MetricsRangeDto) {
    const { from, to } = this.range(q);
    const result = await this.db.query("WITH firsts AS (SELECT customer_id,DATE_TRUNC('month',MIN(completed_at)) AS cohort FROM services WHERE status='completed' GROUP BY customer_id),active AS (SELECT DISTINCT customer_id,DATE_TRUNC('month',completed_at) AS month FROM services WHERE status='completed') SELECT f.cohort,COUNT(*)::int AS customers,COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM active a WHERE a.customer_id=f.customer_id AND a.month>f.cohort))::int AS \"retainedCustomers\" FROM firsts f WHERE f.cohort>=DATE_TRUNC('month',$1::timestamptz) AND f.cohort<DATE_TRUNC('month',$2::timestamptz) GROUP BY f.cohort ORDER BY f.cohort", [from, to]);
    return { from, to, cohorts: result.rows.map((row) => ({ cohort: row.cohort, customers: row.customers, retainedCustomers: row.retainedCustomers, retentionRate: row.customers ? Number(row.retainedCustomers) / Number(row.customers) : 0 })) };
  }

  async createCampaign(user: AuthPrincipal, dto: CreateCampaignDto) {
    const result = await this.db.query('INSERT INTO campaigns(code,name,status,starts_at,ends_at,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,code,name,status,starts_at AS "startsAt",ends_at AS "endsAt"', [dto.code.trim().toUpperCase(), dto.name.trim(), dto.status ?? 'draft', dto.startsAt ?? null, dto.endsAt ?? null, user.accountId]);
    await this.db.query("INSERT INTO audit_events(actor_id,event_type,resource_type,resource_id,outcome,metadata) VALUES($1,'growth.campaign.created','campaign',$2,'success',$3)", [user.accountId, result.rows[0].id, dto]);
    return result.rows[0];
  }

  async referrals() {
    const result = await this.db.query('SELECT id,status,created_at AS "createdAt",qualified_at AS "qualifiedAt",referral_code AS "referralCode",referrer_id AS "referrerId",referred_id AS "referredId" FROM referrals ORDER BY created_at DESC LIMIT 500');
    return result.rows;
  }

  async founders() {
    const result = await this.db.query('SELECT f.account_id AS "accountId",f.cohort,f.enrolled_at AS "enrolledAt",a.role,p.display_name AS "displayName" FROM founder_program f JOIN accounts a ON a.id=f.account_id JOIN profiles p ON p.account_id=f.account_id ORDER BY f.enrolled_at DESC LIMIT 500');
    return result.rows;
  }

  private range(q: MetricsRangeDto) {
    const from = q.from ?? new Date(Date.now() - 30 * 86400000).toISOString();
    const to = q.to ?? new Date().toISOString();
    if (new Date(from).getTime() >= new Date(to).getTime()) throw new ConflictException('Invalid metrics range');
    return { from, to };
  }

  private async audit(client: PoolClient, actor: string, type: string, id: string) {
    await client.query("INSERT INTO audit_events(actor_id,event_type,resource_type,resource_id,outcome,metadata) VALUES($1,$2,'growth',$3,'success','{}'::jsonb)", [actor, type, id]);
  }

  private async idempotent(user: AuthPrincipal, operation: string, key: string, payload: unknown, work: (client: PoolClient) => Promise<{ status: number; body: Record<string, unknown> }>) {
    if (!key || key.length > 128) throw new ConflictException('Valid Idempotency-Key is required');
    const requestHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${user.accountId}:${operation}:${key}`]);
      const existing = await client.query('SELECT request_hash AS "requestHash",response_status AS "responseStatus",response_body AS "responseBody" FROM idempotency_keys WHERE account_id=$1 AND idempotency_key=$2 AND operation=$3 FOR UPDATE', [user.accountId, key, operation]);
      if (existing.rowCount) {
        const row = existing.rows[0];
        if (row.requestHash !== requestHash) throw new ConflictException('Idempotency-Key was already used with a different payload');
        await client.query('COMMIT');
        return { status: row.responseStatus, body: row.responseBody as Record<string, unknown> };
      }
      const result = await work(client);
      await client.query('INSERT INTO idempotency_keys(account_id,idempotency_key,operation,request_hash,response_status,response_body) VALUES ($1,$2,$3,$4,$5,$6)', [user.accountId, key, operation, requestHash, result.status, result.body]);
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