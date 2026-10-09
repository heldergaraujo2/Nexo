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
import {
  CargoProposalDto,
  CargoTransitionDto,
  CreateCargoRequestDto,
} from './dto';

type JsonObject = Record<string, unknown>;
type CargoStatus =
  | 'accepted'
  | 'provider_en_route'
  | 'at_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

@Injectable()
export class CargoService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async createRequest(
    user: AuthPrincipal,
    dto: CreateCargoRequestDto,
    key: string,
  ) {
    if (user.role !== 'customer')
      throw new ForbiddenException('Customer role required');
    this.validateCoordinates(dto.origin);
    this.validateCoordinates(dto.destination);
    return this.withIdempotency(
      user,
      'cargo.request.create',
      key,
      dto,
      async (client) => {
        const requirements = {
          cargoDescription: dto.cargoDescription.trim(),
          notes: dto.notes?.trim() ?? null,
          weightGrams: dto.weightGrams ?? null,
          lengthMm: dto.lengthMm ?? null,
          widthMm: dto.widthMm ?? null,
          heightMm: dto.heightMm ?? null,
          media: dto.media ?? [],
        };
        const result = await client.query(
          'INSERT INTO service_requests (customer_id,category,description,requirements,origin,destination,status) VALUES ($1,\'cargo\',$2,$3,$4,$5,\'open\') RETURNING id,customer_id AS "customerId",category,description,requirements,origin,destination,status,created_at AS "createdAt"',
          [
            user.accountId,
            dto.cargoDescription.trim(),
            requirements,
            dto.origin,
            dto.destination,
          ],
        );
        await this.audit(
          client,
          user.accountId,
          'cargo.request_created',
          'service_request',
          result.rows[0].id,
        );
        return { status: 201, body: result.rows[0] };
      },
    );
  }

  async getRequest(user: AuthPrincipal, requestId: string) {
    const result = await this.db.query(
      'SELECT id,customer_id AS "customerId",category,description,requirements,origin,destination,status,matched_provider_id AS "matchedProviderId" FROM service_requests WHERE id=$1',
      [requestId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Cargo request not found');
    if (
      row.customerId !== user.accountId &&
      row.matchedProviderId !== user.accountId
    )
      throw new ForbiddenException('Cargo request access denied');
    return row;
  }

  async createProposal(
    user: AuthPrincipal,
    requestId: string,
    dto: CargoProposalDto,
    key: string,
  ) {
    if (user.role !== 'provider')
      throw new ForbiddenException('Only providers can propose cargo prices');
    return this.withIdempotency(
      user,
      'cargo.proposal.create:' + requestId,
      key,
      dto,
      async (client) => {
        const req = await client.query(
          'SELECT id,customer_id,category,status FROM service_requests WHERE id=$1 FOR UPDATE',
          [requestId],
        );
        const row = req.rows[0];
        if (!row) throw new NotFoundException('Cargo request not found');
        if (row.category !== 'cargo')
          throw new ConflictException('Not a cargo request');
        if (!['open', 'matched'].includes(row.status))
          throw new ConflictException('Cargo request is not negotiable');
        if (
          !(await this.providerEligible(
            client,
            user.accountId,
            row.customer_id,
          ))
        )
          throw new ForbiddenException(
            'Provider is not eligible for this cargo request',
          );
        const current = await client.query(
          'SELECT id,version,status FROM cargo_proposals WHERE request_id=$1 ORDER BY version DESC LIMIT 1 FOR UPDATE',
          [requestId],
        );
        if (current.rowCount && current.rows[0].status === 'offered')
          throw new ConflictException(
            'A cargo proposal is already awaiting response',
          );
        const version = current.rowCount
          ? Number(current.rows[0].version) + 1
          : 1;
        const result = await client.query(
          'INSERT INTO cargo_proposals (request_id,proposer_id,recipient_id,version,amount_cents,message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,request_id AS "requestId",proposer_id AS "proposerId",recipient_id AS "recipientId",version,amount_cents AS "amountCents",currency,message,status,created_at AS "createdAt"',
          [
            requestId,
            user.accountId,
            row.customer_id,
            version,
            dto.amountCents,
            dto.message ?? null,
          ],
        );
        if (row.status === 'open')
          await client.query(
            "UPDATE service_requests SET status='matched',matched_provider_id=$1,updated_at=NOW() WHERE id=$2",
            [user.accountId, requestId],
          );
        await this.notify(client, row.customer_id, 'cargo.proposal_received', {
          requestId,
          proposalId: result.rows[0].id,
        });
        return {
          status: 201,
          body: {
            ...result.rows[0],
            amountCents: Number(result.rows[0].amountCents),
          },
        };
      },
    );
  }

  async counter(
    user: AuthPrincipal,
    proposalId: string,
    dto: CargoProposalDto,
    key: string,
  ) {
    return this.withIdempotency(
      user,
      'cargo.proposal.counter:' + proposalId,
      key,
      dto,
      async (client) => {
        const found = await client.query(
          'SELECT p.*,r.customer_id,r.category,r.status AS request_status FROM cargo_proposals p JOIN service_requests r ON r.id=p.request_id WHERE p.id=$1 FOR UPDATE',
          [proposalId],
        );
        const row = found.rows[0];
        if (!row) throw new NotFoundException('Cargo proposal not found');
        if (row.status !== 'offered')
          throw new ConflictException('Proposal is not awaiting response');
        if (row.recipient_id !== user.accountId)
          throw new ForbiddenException(
            'Only the proposal recipient can counter',
          );
        const req = await client.query(
          'SELECT status FROM service_requests WHERE id=$1 FOR UPDATE',
          [row.request_id],
        );
        if (!['open', 'matched'].includes(req.rows[0]?.status))
          throw new ConflictException('Cargo request is not negotiable');
        const version = Number(row.version) + 1;
        await client.query(
          "UPDATE cargo_proposals SET status='countered' WHERE id=$1",
          [proposalId],
        );
        const result = await client.query(
          'INSERT INTO cargo_proposals (request_id,proposer_id,recipient_id,version,amount_cents,message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,request_id AS "requestId",proposer_id AS "proposerId",recipient_id AS "recipientId",version,amount_cents AS "amountCents",currency,message,status,created_at AS "createdAt"',
          [
            row.request_id,
            user.accountId,
            row.proposer_id,
            version,
            dto.amountCents,
            dto.message ?? null,
          ],
        );
        await this.notify(client, row.proposer_id, 'cargo.proposal_countered', {
          requestId: row.request_id,
          proposalId: result.rows[0].id,
        });
        return {
          status: 200,
          body: {
            ...result.rows[0],
            amountCents: Number(result.rows[0].amountCents),
          },
        };
      },
    );
  }

  async accept(user: AuthPrincipal, proposalId: string, key: string) {
    return this.withIdempotency(
      user,
      'cargo.proposal.accept:' + proposalId,
      key,
      {},
      async (client) => {
        const found = await client.query(
          'SELECT p.*,r.customer_id,r.category,r.status AS request_status,r.origin,r.destination,r.requirements FROM cargo_proposals p JOIN service_requests r ON r.id=p.request_id WHERE p.id=$1 FOR UPDATE',
          [proposalId],
        );
        const row = found.rows[0];
        if (!row) throw new NotFoundException('Cargo proposal not found');
        if (row.status !== 'offered')
          throw new ConflictException('Proposal is not awaiting response');
        if (row.recipient_id !== user.accountId)
          throw new ForbiddenException(
            'Only the proposal recipient can accept',
          );
        const req = await client.query(
          'SELECT * FROM service_requests WHERE id=$1 FOR UPDATE',
          [row.request_id],
        );
        if (
          !req.rowCount ||
          req.rows[0].category !== 'cargo' ||
          !['open', 'matched'].includes(req.rows[0].status)
        )
          throw new ConflictException('Cargo request is not available');
        const participants = await client.query(
          'SELECT id, role FROM accounts WHERE id = ANY($1::uuid[])',
          [[row.proposer_id, row.recipient_id]],
        );
        const roles = new Map(
          participants.rows.map((participant) => [
            participant.id,
            participant.role,
          ]),
        );
        const proposerRole = roles.get(row.proposer_id);
        const recipientRole = roles.get(row.recipient_id);
        if (!(
          (proposerRole === 'provider' && recipientRole === 'customer') ||
          (proposerRole === 'customer' && recipientRole === 'provider')
        )) {
          throw new ConflictException(
            'Cargo proposal must have exactly one customer and one provider',
          );
        }
        const providerId =
          proposerRole === 'provider' ? row.proposer_id : row.recipient_id;
        const customerId =
          proposerRole === 'customer' ? row.proposer_id : row.recipient_id;
        if (customerId !== row.customer_id)
          throw new ConflictException(
            'Cargo proposal customer does not match request',
          );
        const offer = await client.query(
          "INSERT INTO offers (request_id,provider_id,offer_type,amount_cents,currency,message,status) VALUES ($1,$2,'priced_offer',$3,$4,$5,'accepted') RETURNING id",
          [
            row.request_id,
            providerId,
            row.amount_cents,
            row.currency,
            row.message ?? null,
          ],
        );
        const service = await client.query(
          'INSERT INTO services (request_id,accepted_offer_id,customer_id,provider_id,category,status,price_cents,currency) VALUES ($1,$2,$3,$4,\'cargo\',\'accepted\',$5,$6) RETURNING id,request_id AS "requestId",customer_id AS "customerId",provider_id AS "providerId",category,status,price_cents AS "priceCents",currency,created_at AS "createdAt"',
          [
            row.request_id,
            offer.rows[0].id,
            customerId,
            providerId,
            row.amount_cents,
            row.currency,
          ],
        );
        const requirements = req.rows[0].requirements as Record<
          string,
          unknown
        >;
        const cargo = await client.query(
          'INSERT INTO cargo_jobs (service_id,origin,destination,cargo_description,weight_grams,length_mm,width_mm,height_mm,media) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
          [
            service.rows[0].id,
            req.rows[0].origin,
            req.rows[0].destination,
            String(requirements.cargoDescription),
            requirements.weightGrams ?? null,
            requirements.lengthMm ?? null,
            requirements.widthMm ?? null,
            requirements.heightMm ?? null,
            requirements.media ?? [],
          ],
        );
        await client.query(
          "UPDATE cargo_proposals SET status='accepted' WHERE id=$1",
          [proposalId],
        );
        await client.query(
          "UPDATE cargo_proposals SET status='rejected' WHERE request_id=$1 AND id<>$2 AND status IN ('offered','countered')",
          [row.request_id, proposalId],
        );
        await client.query(
          "UPDATE service_requests SET status='accepted',matched_provider_id=$1,accepted_offer_id=$2,updated_at=NOW() WHERE id=$3",
          [providerId, offer.rows[0].id, row.request_id],
        );
        await this.audit(
          client,
          user.accountId,
          'cargo.price_accepted',
          'cargo_job',
          cargo.rows[0].id,
        );
        await this.notify(client, providerId, 'cargo.proposal_accepted', {
          requestId: row.request_id,
          proposalId,
          serviceId: service.rows[0].id,
        });
        return {
          status: 201,
          body: {
            ...service.rows[0],
            priceCents: Number(service.rows[0].priceCents),
            cargoId: cargo.rows[0].id,
          },
        };
      },
    );
  }

  async proposals(user: AuthPrincipal, requestId: string) {
    await this.getRequest(user, requestId);
    const result = await this.db.query(
      'SELECT id,request_id AS "requestId",proposer_id AS "proposerId",recipient_id AS "recipientId",version,amount_cents AS "amountCents",currency,message,status,created_at AS "createdAt" FROM cargo_proposals WHERE request_id=$1 ORDER BY version ASC',
      [requestId],
    );
    return result.rows.map((row) => ({
      ...row,
      amountCents: Number(row.amountCents),
    }));
  }

  async get(user: AuthPrincipal, id: string) {
    const result = await this.db.query(
      'SELECT c.*,s.customer_id AS "customerId",s.provider_id AS "providerId" FROM cargo_jobs c JOIN services s ON s.id=c.service_id WHERE c.id=$1',
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Cargo not found');
    if (row.customerId !== user.accountId && row.providerId !== user.accountId)
      throw new ForbiddenException('Cargo access denied');
    return this.public(row);
  }

  async transition(
    user: AuthPrincipal,
    id: string,
    next: CargoStatus,
    key: string,
    dto: CargoTransitionDto = {},
  ) {
    return this.withIdempotency(
      user,
      'cargo.transition.' + id + '.' + next,
      key,
      dto,
      async (client) => {
        const result = await client.query(
          'SELECT c.*,s.customer_id,s.provider_id,s.request_id FROM cargo_jobs c JOIN services s ON s.id=c.service_id WHERE c.id=$1 FOR UPDATE',
          [id],
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundException('Cargo not found');
        if (
          row.customer_id !== user.accountId &&
          row.provider_id !== user.accountId
        )
          throw new ForbiddenException('Cargo access denied');
        const allowed: Record<string, CargoStatus[]> = {
          provider_en_route: ['accepted'],
          at_pickup: ['provider_en_route'],
          picked_up: ['at_pickup'],
          in_transit: ['picked_up'],
          delivered: ['in_transit'],
          cancelled: ['accepted', 'provider_en_route', 'at_pickup'],
        };
        if (!allowed[next]?.includes(row.status))
          throw new ConflictException('Invalid cargo state transition');
        if (next !== 'cancelled' && user.accountId !== row.provider_id)
          throw new ForbiddenException('Only provider can advance cargo');
        const updated = await client.query(
          'UPDATE cargo_jobs SET status=$1,picked_up_at=CASE WHEN $1=\'picked_up\' THEN NOW() ELSE picked_up_at END,delivered_at=CASE WHEN $1=\'delivered\' THEN NOW() ELSE delivered_at END,updated_at=NOW() WHERE id=$2 RETURNING id,service_id AS "serviceId",status,updated_at AS "updatedAt",picked_up_at AS "pickedUpAt",delivered_at AS "deliveredAt"',
          [next, id],
        );
        const serviceStatus =
          next === 'delivered'
            ? 'completed'
            : next === 'cancelled'
              ? 'cancelled'
              : 'in_progress';
        await client.query(
          "UPDATE services SET status=$1,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,updated_at=NOW() WHERE id=$2",
          [serviceStatus, row.service_id],
        );
        await client.query(
          'UPDATE service_requests SET status=$1,updated_at=NOW() WHERE id=$2',
          [serviceStatus, row.request_id],
        );
        await client.query(
          'INSERT INTO cargo_events (cargo_job_id,actor_id,from_status,to_status,reason) VALUES ($1,$2,$3,$4,$5)',
          [id, user.accountId, row.status, next, dto.reason ?? null],
        );
        await this.audit(
          client,
          user.accountId,
          'cargo.' + next,
          'cargo_job',
          id,
        );
        const recipient =
          user.accountId === row.customer_id
            ? row.provider_id
            : row.customer_id;
        if (recipient)
          await this.notify(client, recipient, 'cargo.' + next, {
            cargoId: id,
            serviceId: row.service_id,
          });
        return { status: 200, body: updated.rows[0] };
      },
    );
  }

  private public(row: Record<string, unknown>) {
    return {
      id: row.id,
      serviceId: row.serviceId ?? row.service_id,
      origin: row.origin,
      destination: row.destination,
      cargoDescription: row.cargoDescription ?? row.cargo_description,
      weightGrams: row.weightGrams ?? row.weight_grams ?? null,
      lengthMm: row.lengthMm ?? row.length_mm ?? null,
      widthMm: row.widthMm ?? row.width_mm ?? null,
      heightMm: row.heightMm ?? row.height_mm ?? null,
      media: row.media,
      status: row.status,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
      pickedUpAt: row.pickedUpAt ?? row.picked_up_at ?? null,
      deliveredAt: row.deliveredAt ?? row.delivered_at ?? null,
    };
  }
  private validateCoordinates(value: unknown) {
    if (!value || typeof value !== 'object')
      throw new ConflictException('Invalid coordinates');
    const row = value as Record<string, unknown>;
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    )
      throw new ConflictException('Invalid coordinates');
  }
  private async providerEligible(
    client: PoolClient,
    providerId: string,
    customerId: string,
  ) {
    const result = await client.query(
      "SELECT a.id FROM accounts a JOIN provider_marketplace p ON p.account_id=a.id WHERE a.id=$1 AND a.role='provider' AND a.status='active' AND p.availability IN ('available','busy') AND p.accepting_requests=true AND 'cargo'=ANY(p.categories) AND a.id<>$2",
      [providerId, customerId],
    );
    if (!result.rowCount) return false;
    const blocked = await client.query(
      'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',
      [providerId, customerId],
    );
    return !blocked.rowCount;
  }
  private async notify(
    client: PoolClient,
    recipientId: string,
    type: string,
    payload: JsonObject,
  ) {
    await client.query(
      'INSERT INTO notifications (recipient_id,type,payload) VALUES ($1,$2,$3)',
      [recipientId, type, payload],
    );
  }
  private async audit(
    client: PoolClient,
    actorId: string,
    eventType: string,
    resourceType: string,
    resourceId: string,
  ) {
    await client.query(
      "INSERT INTO audit_events (actor_id,event_type,resource_type,resource_id,outcome,metadata) VALUES ($1,$2,$3,$4,'success','{}'::jsonb)",
      [actorId, eventType, resourceType, resourceId],
    );
  }
  private async withIdempotency(
    user: AuthPrincipal,
    operation: string,
    key: string,
    payload: unknown,
    work: (client: PoolClient) => Promise<{ status: number; body: JsonObject }>,
  ) {
    if (!key || key.length > 128)
      throw new ConflictException('Valid Idempotency-Key is required');
    const requestHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
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
        if (row.requestHash !== requestHash)
          throw new ConflictException(
            'Idempotency-Key was already used with a different payload',
          );
        await client.query('COMMIT');
        return {
          status: row.responseStatus,
          body: row.responseBody as JsonObject,
        };
      }
      const result = await work(client);
      await client.query(
        'INSERT INTO idempotency_keys (account_id,idempotency_key,operation,request_hash,response_status,response_body) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          user.accountId,
          key,
          operation,
          requestHash,
          result.status,
          result.body,
        ],
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
