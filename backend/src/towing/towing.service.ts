import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import { CreateTowingRequestDto, TowingTransitionDto } from './dto';

type TowingStatus = 'accepted'|'provider_en_route'|'arrived'|'loading'|'in_tow'|'completed'|'cancelled';
type JsonObject = Record<string, unknown>;

@Injectable()
export class TowingService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async createRequest(user: AuthPrincipal, dto: CreateTowingRequestDto, key: string) {
    if (user.role !== 'customer') throw new ForbiddenException('Customer role required');
    this.validateCoordinate(dto.origin);
    if (dto.destination) this.validateCoordinate(dto.destination);
    return this.withIdempotency(user, 'towing.request.create', key, dto, async (client) => {
      const requirements = {
        problemDescription: dto.problemDescription.trim(),
        media: dto.media ?? [],
      };
      const result = await client.query(
        `INSERT INTO service_requests (customer_id,category,description,requirements,origin,destination,status)
         VALUES ($1,'towing',$2,$3,$4,$5,'open')
         RETURNING id,customer_id AS "customerId",category,description,requirements,origin,destination,status,created_at AS "createdAt"`,
        [user.accountId, dto.problemDescription.trim(), requirements, dto.origin, dto.destination ?? null],
      );
      await this.audit(client, user.accountId, 'towing.request_created', 'service_request', result.rows[0].id);
      return { status: 201, body: result.rows[0] };
    });
  }

  async createForService(client: PoolClient, serviceId: string, requestRow: Record<string, unknown>) {
    const requirements = (requestRow.requirements ?? {}) as Record<string, unknown>;
    const description = String(requirements.problemDescription ?? requestRow.description ?? '').trim();
    if (!description) throw new ConflictException('Towing problem description is required');
    const result = await client.query(
      `INSERT INTO towing_jobs (service_id,origin,destination,problem_description,media)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,service_id AS "serviceId",origin,destination,problem_description AS "problemDescription",media,status,created_at AS "createdAt"`,
      [serviceId, requestRow.origin, requestRow.destination ?? null, description, requirements.media ?? []],
    );
    return result.rows[0];
  }

  async getRequest(user: AuthPrincipal, requestId: string) {
    const result = await this.db.query(
      `SELECT id,customer_id AS "customerId",category,description,requirements,origin,destination,status,
              matched_provider_id AS "matchedProviderId",accepted_offer_id AS "acceptedOfferId"
       FROM service_requests WHERE id=$1`,
      [requestId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Towing request not found');
    if (row.customerId !== user.accountId && row.matchedProviderId !== user.accountId) {
      throw new ForbiddenException('Towing request access denied');
    }
    if (row.category !== 'towing') throw new ConflictException('Not a towing request');
    return row;
  }

  async get(user: AuthPrincipal, id: string) {
    const result = await this.db.query(
      `SELECT t.*,s.customer_id AS "customerId",s.provider_id AS "providerId"
       FROM towing_jobs t JOIN services s ON s.id=t.service_id WHERE t.id=$1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Towing job not found');
    if (row.customerId !== user.accountId && row.providerId !== user.accountId) {
      throw new ForbiddenException('Towing access denied');
    }
    return this.public(row);
  }

  async transition(user: AuthPrincipal, id: string, next: TowingStatus, key: string, dto: TowingTransitionDto = {}) {
    return this.withIdempotency(user, `towing.transition.${id}.${next}`, key, dto, async (client) => {
      const result = await client.query(
        `SELECT t.*,s.customer_id,s.provider_id,s.request_id,s.status AS service_status
         FROM towing_jobs t JOIN services s ON s.id=t.service_id WHERE t.id=$1 FOR UPDATE`,
        [id],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Towing job not found');
      if (row.customer_id !== user.accountId && row.provider_id !== user.accountId) {
        throw new ForbiddenException('Towing access denied');
      }
      const allowed: Record<string, TowingStatus[]> = {
        provider_en_route: ['accepted'],
        arrived: ['provider_en_route'],
        loading: ['arrived'],
        in_tow: ['loading'],
        completed: ['in_tow'],
        cancelled: ['accepted','provider_en_route','arrived','loading'],
      };
      if (!allowed[next]?.includes(row.status)) throw new ConflictException('Invalid towing state transition');
      if (next !== 'cancelled' && user.accountId !== row.provider_id) {
        throw new ForbiddenException('Only the provider can advance towing');
      }
      const serviceStatus = next === 'completed' ? 'completed' : next === 'cancelled' ? 'cancelled' : next === 'provider_en_route' || next === 'arrived' || next === 'loading' || next === 'in_tow' ? 'in_progress' : 'accepted';
      const updated = await client.query(
        `UPDATE towing_jobs
         SET status=$1,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,updated_at=NOW()
         WHERE id=$2
         RETURNING id,service_id AS "serviceId",status,updated_at AS "updatedAt",completed_at AS "completedAt"`,
        [next, id],
      );
      await client.query(
        `UPDATE services SET status=$1,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,updated_at=NOW()
         WHERE id=$2`,
        [serviceStatus, row.service_id],
      );
      await client.query(
        'UPDATE service_requests SET status=$1,updated_at=NOW() WHERE id=$2',
        [serviceStatus, row.request_id],
      );
      await client.query(
        'INSERT INTO towing_events (towing_job_id,actor_id,from_status,to_status,reason) VALUES ($1,$2,$3,$4,$5)',
        [id, user.accountId, row.status, next, dto.reason ?? null],
      );
      await this.audit(client, user.accountId, `towing.${next}`, 'towing_job', id);
      const recipient = user.accountId === row.customer_id ? row.provider_id : row.customer_id;
      await client.query(
        'INSERT INTO notifications (recipient_id,type,payload) VALUES ($1,$2,$3)',
        [recipient, `towing.${next}`, { towingId: id, serviceId: row.service_id }],
      );
      return { status: 200, body: updated.rows[0] };
    });
  }

  private public(row: Record<string, unknown>) {
    return {
      id: row.id,
      serviceId: row.serviceId ?? row.service_id,
      origin: row.origin,
      destination: row.destination,
      problemDescription: row.problemDescription ?? row.problem_description,
      media: row.media,
      status: row.status,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
      completedAt: row.completedAt ?? row.completed_at ?? null,
    };
  }

  private validateCoordinate(value: unknown) {
    if (!value || typeof value !== 'object') throw new ConflictException('Invalid coordinates');
    const row = value as Record<string, unknown>;
    const lat = Number(row.latitude); const lng = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ConflictException('Invalid coordinates');
    }
  }

  private async providerEligible(client: PoolClient, providerId: string, customerId: string) {
    const provider = await client.query(
      `SELECT a.id FROM accounts a
       JOIN provider_marketplace p ON p.account_id=a.id
       WHERE a.id=$1 AND a.role='provider' AND a.status='active'
         AND p.availability IN ('available','busy') AND p.accepting_requests=true
         AND 'towing'=ANY(p.categories) AND a.id<>$2
         AND EXISTS (SELECT 1 FROM vehicles v WHERE v.provider_id=a.id AND v.status='verified')`,
      [providerId, customerId],
    );
    if (!provider.rowCount) throw new ForbiddenException('Provider is not eligible for towing');
    const blocked = await client.query(
      'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',
      [providerId, customerId],
    );
    if (blocked.rowCount) throw new ForbiddenException('Participants are blocked');
  }

  private async audit(client: PoolClient, actorId: string, eventType: string, resourceType: string, resourceId: string) {
    await client.query(
      `INSERT INTO audit_events (actor_id,event_type,resource_type,resource_id,outcome,metadata)
       VALUES ($1,$2,$3,$4,'success','{}'::jsonb')`,
      [actorId,eventType,resourceType,resourceId],
    );
  }

  private async withIdempotency(user: AuthPrincipal, operation: string, key: string, payload: unknown, work: (client: PoolClient) => Promise<{status:number;body:JsonObject}>) {
    if (!key || key.length > 128) throw new ConflictException('Valid Idempotency-Key is required');
    const requestHash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const client=await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.accountId+':'+operation+':'+key]);
      const existing=await client.query(
        'SELECT request_hash AS "requestHash",response_status AS "responseStatus",response_body AS "responseBody" FROM idempotency_keys WHERE account_id=$1 AND idempotency_key=$2 AND operation=$3 FOR UPDATE',
        [user.accountId,key,operation],
      );
      if(existing.rowCount){
        const row=existing.rows[0];
        if(row.requestHash!==requestHash) throw new ConflictException('Idempotency-Key was already used with a different payload');
        await client.query('COMMIT');
        return {status:row.responseStatus,body:row.responseBody as JsonObject};
      }
      const result=await work(client);
      await client.query(
        'INSERT INTO idempotency_keys (account_id,idempotency_key,operation,request_hash,response_status,response_body) VALUES ($1,$2,$3,$4,$5,$6)',
        [user.accountId,key,operation,requestHash,result.status,result.body],
      );
      await client.query('COMMIT'); return result;
    } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
  }
}
