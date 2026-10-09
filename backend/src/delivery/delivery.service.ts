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
import { CreateDeliveryRequestDto, DeliveryTransitionDto } from './dto';

type DeliveryStatus =
  | 'accepted'
  | 'provider_en_route'
  | 'at_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';
type JsonObject = Record<string, unknown>;

@Injectable()
export class DeliveryService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async createRequest(
    user: AuthPrincipal,
    dto: CreateDeliveryRequestDto,
    key: string,
  ) {
    if (user.role !== 'customer')
      throw new ForbiddenException('Customer role required');
    this.validateCoordinates(dto.origin);
    this.validateCoordinates(dto.destination);
    return this.withIdempotency(
      user,
      'delivery.request.create',
      key,
      dto,
      async (client) => {
        const requirements = {
          itemDescription: dto.itemDescription.trim(),
          notes: dto.notes?.trim() ?? null,
          media: dto.media ?? [],
        };
        const result = await client.query(
          'INSERT INTO service_requests (customer_id,category,description,requirements,origin,destination,status) VALUES ($1,\'delivery\',$2,$3,$4,$5,\'open\') RETURNING id,customer_id AS "customerId",category,description,requirements,origin,destination,status,created_at AS "createdAt"',
          [
            user.accountId,
            dto.itemDescription.trim(),
            requirements,
            dto.origin,
            dto.destination,
          ],
        );
        await this.audit(
          client,
          user.accountId,
          'delivery.request_created',
          'service_request',
          result.rows[0].id,
        );
        return { status: 201, body: result.rows[0] };
      },
    );
  }

  async createForService(
    client: PoolClient,
    serviceId: string,
    requestRow: Record<string, unknown>,
  ) {
    const requirements = (requestRow.requirements ?? {}) as Record<
      string,
      unknown
    >;
    const itemDescription = String(
      requirements.itemDescription ?? requestRow.description ?? '',
    ).trim();
    if (!itemDescription)
      throw new ConflictException('Delivery item description is required');
    const result = await client.query(
      'INSERT INTO deliveries (service_id,origin,destination,item_description,notes,media) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,service_id AS "serviceId",origin,destination,item_description AS "itemDescription",notes,media,status,created_at AS "createdAt"',
      [
        serviceId,
        requestRow.origin,
        requestRow.destination,
        itemDescription,
        requirements.notes ?? null,
        requirements.media ?? [],
      ],
    );
    return result.rows[0];
  }

  async get(user: AuthPrincipal, id: string) {
    const result = await this.db.query(
      'SELECT d.*,s.customer_id AS "customerId",s.provider_id AS "providerId" FROM deliveries d JOIN services s ON s.id=d.service_id WHERE d.id=$1',
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Delivery not found');
    if (row.customerId !== user.accountId && row.providerId !== user.accountId)
      throw new ForbiddenException('Delivery access denied');
    return this.public(row);
  }

  async transition(
    user: AuthPrincipal,
    id: string,
    next: DeliveryStatus,
    key: string,
    dto: DeliveryTransitionDto = {},
  ) {
    return this.withIdempotency(
      user,
      'delivery.transition.' + id + '.' + next,
      key,
      dto,
      async (client) => {
        const result = await client.query(
          'SELECT d.*,s.customer_id,s.provider_id,s.request_id FROM deliveries d JOIN services s ON s.id=d.service_id WHERE d.id=$1 FOR UPDATE',
          [id],
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundException('Delivery not found');
        if (
          row.customer_id !== user.accountId &&
          row.provider_id !== user.accountId
        )
          throw new ForbiddenException('Delivery access denied');
        const allowed: Record<string, DeliveryStatus[]> = {
          provider_en_route: ['accepted'],
          at_pickup: ['provider_en_route'],
          picked_up: ['at_pickup'],
          in_transit: ['picked_up'],
          delivered: ['in_transit'],
          cancelled: ['accepted', 'provider_en_route', 'at_pickup'],
        };
        if (!allowed[next]?.includes(row.status))
          throw new ConflictException('Invalid delivery state transition');
        if (next !== 'cancelled' && user.accountId !== row.provider_id)
          throw new ForbiddenException(
            'Only the provider can advance the delivery',
          );
        if (
          next === 'cancelled' &&
          user.accountId !== row.customer_id &&
          user.accountId !== row.provider_id
        )
          throw new ForbiddenException('Delivery access denied');
        const updated = await client.query(
          'UPDATE deliveries SET status=$1,picked_up_at=CASE WHEN $1=\'picked_up\' THEN NOW() ELSE picked_up_at END,delivered_at=CASE WHEN $1=\'delivered\' THEN NOW() ELSE delivered_at END,updated_at=NOW() WHERE id=$2 RETURNING id,service_id AS "serviceId",status,updated_at AS "updatedAt",picked_up_at AS "pickedUpAt",delivered_at AS "deliveredAt"',
          [next, id],
        );
        const serviceStatus =
          next === 'delivered'
            ? 'completed'
            : next === 'cancelled'
              ? 'cancelled'
              : next === 'provider_en_route' ||
                  next === 'at_pickup' ||
                  next === 'picked_up' ||
                  next === 'in_transit'
                ? 'in_progress'
                : 'accepted';
        await client.query(
          "UPDATE services SET status=$1,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,updated_at=NOW() WHERE id=$2",
          [serviceStatus, row.service_id],
        );
        await client.query(
          'UPDATE service_requests SET status=$1,updated_at=NOW() WHERE id=$2',
          [serviceStatus, row.request_id],
        );
        await client.query(
          'INSERT INTO delivery_events (delivery_id,actor_id,from_status,to_status,reason) VALUES ($1,$2,$3,$4,$5)',
          [id, user.accountId, row.status, next, dto.reason ?? null],
        );
        await this.audit(
          client,
          user.accountId,
          'delivery.' + next,
          'delivery',
          id,
        );
        const recipient =
          user.accountId === row.customer_id
            ? row.provider_id
            : row.customer_id;
        if (recipient)
          await client.query(
            'INSERT INTO notifications (recipient_id,type,payload) VALUES ($1,$2,$3)',
            [
              recipient,
              'delivery.' + next,
              { deliveryId: id, serviceId: row.service_id },
            ],
          );
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
      itemDescription: row.itemDescription ?? row.item_description,
      notes: row.notes,
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
