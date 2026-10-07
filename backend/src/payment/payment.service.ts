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
import { ConfirmPaymentDto, CreatePaymentRecordDto, DisputePaymentDto } from './dto';

type JsonObject = Record<string, unknown>;
type PaymentMethod = 'cash' | 'pix' | 'provider_card_machine';

@Injectable()
export class PaymentService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async create(user: AuthPrincipal, serviceId: string, dto: CreatePaymentRecordDto, key: string) {
    this.assertCustomer(user);
    return this.withIdempotency(user, `payment.create:${serviceId}`, key, dto, async (client) => {
      const service = await client.query(
        `SELECT id,customer_id,provider_id,status,price_cents,currency
         FROM services WHERE id=$1 FOR UPDATE`,
        [serviceId],
      );
      const row = service.rows[0];
      if (!row) throw new NotFoundException('Service not found');
      if (row.customer_id !== user.accountId) throw new ForbiddenException('Payment access denied');
      if (row.status !== 'completed') throw new ConflictException('Payment can only be recorded for a completed service');
      if (row.price_cents === null || row.price_cents === undefined) {
        throw new ConflictException('Service has no immutable price snapshot');
      }
      const existing = await client.query(
        `SELECT id,status FROM payment_records
         WHERE service_id=$1 AND status IN ('pending','confirmed') FOR UPDATE`,
        [serviceId],
      );
      if (existing.rowCount) throw new ConflictException('An active payment record already exists for this service');

      const inserted = await client.query(
        `INSERT INTO payment_records
         (service_id,method,expected_amount_cents,currency,external_reference)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id,service_id AS "serviceId",method,expected_amount_cents AS "expectedAmountCents",
                   confirmed_amount_cents AS "confirmedAmountCents",currency,status,
                   external_reference AS "externalReference",created_at AS "createdAt"`,
        [serviceId, dto.method, Number(row.price_cents), row.currency, dto.externalReference ?? null],
      );
      const payment = this.publicPayment(inserted.rows[0]);
      await this.audit(client, user.accountId, 'payment.created', payment.id, {
        method: dto.method,
        expectedAmountCents: payment.expectedAmountCents,
      });
      return { status: 201, body: payment };
    });
  }

  async confirm(user: AuthPrincipal, paymentId: string, dto: ConfirmPaymentDto, key: string) {
    this.assertProvider(user);
    return this.withIdempotency(user, `payment.confirm:${paymentId}`, key, dto, async (client) => {
      const result = await client.query(
        `SELECT p.*,s.customer_id,s.provider_id,s.status AS service_status
         FROM payment_records p JOIN services s ON s.id=p.service_id
         WHERE p.id=$1 FOR UPDATE`,
        [paymentId],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Payment record not found');
      if (row.provider_id !== user.accountId) throw new ForbiddenException('Payment confirmation denied');
      if (row.service_status !== 'completed') throw new ConflictException('Service is not completed');
      if (row.status === 'confirmed') {
        if (Number(row.confirmed_amount_cents) !== dto.confirmedAmountCents) {
          throw new ConflictException('Payment is already confirmed with a different amount');
        }
        return { status: 200, body: this.publicPayment(row) };
      }
      if (!['pending', 'disputed'].includes(row.status)) {
        throw new ConflictException('Payment cannot be confirmed in its current state');
      }
      if (dto.confirmedAmountCents !== Number(row.expected_amount_cents)) {
        throw new ConflictException('Confirmed amount must equal the expected service price');
      }
      const updated = await client.query(
        `UPDATE payment_records
         SET confirmed_amount_cents=$1,status='confirmed',confirmed_by=$2,confirmed_at=NOW(),updated_at=NOW()
         WHERE id=$3
         RETURNING *`,
        [dto.confirmedAmountCents, user.accountId, paymentId],
      );
      await this.audit(client, user.accountId, 'payment.confirmed', paymentId, {
        amountCents: dto.confirmedAmountCents,
      });
      return { status: 200, body: this.publicPayment(updated.rows[0]) };
    });
  }

  async dispute(user: AuthPrincipal, paymentId: string, dto: DisputePaymentDto, key: string) {
    if (user.role !== 'customer' && user.role !== 'provider') {
      throw new ForbiddenException('Customer or provider role required');
    }
    return this.withIdempotency(user, `payment.dispute:${paymentId}`, key, dto, async (client) => {
      const result = await client.query(
        `SELECT p.*,s.customer_id,s.provider_id FROM payment_records p
         JOIN services s ON s.id=p.service_id WHERE p.id=$1 FOR UPDATE`,
        [paymentId],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Payment record not found');
      if (row.customer_id !== user.accountId && row.provider_id !== user.accountId) {
        throw new ForbiddenException('Payment access denied');
      }
      if (row.status === 'confirmed') throw new ConflictException('Confirmed payments require a formal dispute flow');
      if (row.status === 'failed') throw new ConflictException('Failed payments cannot be disputed');
      const updated = await client.query(
        `UPDATE payment_records SET status='disputed',updated_at=NOW() WHERE id=$1 RETURNING *`,
        [paymentId],
      );
      await this.audit(client, user.accountId, 'payment.disputed', paymentId, { reason: dto.reason });
      return { status: 200, body: this.publicPayment(updated.rows[0]) };
    });
  }

  async get(user: AuthPrincipal, paymentId: string) {
    const result = await this.db.query(
      `SELECT p.*,s.customer_id,s.provider_id FROM payment_records p
       JOIN services s ON s.id=p.service_id WHERE p.id=$1`,
      [paymentId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Payment record not found');
    if (row.customer_id !== user.accountId && row.provider_id !== user.accountId) {
      throw new ForbiddenException('Payment access denied');
    }
    return this.publicPayment(row);
  }

  async listForService(user: AuthPrincipal, serviceId: string) {
    const result = await this.db.query(
      `SELECT p.*,s.customer_id,s.provider_id FROM payment_records p
       JOIN services s ON s.id=p.service_id WHERE p.service_id=$1
       ORDER BY p.created_at DESC`,
      [serviceId],
    );
    const service = await this.db.query('SELECT customer_id,provider_id FROM services WHERE id=$1', [serviceId]);
    const owner = service.rows[0];
    if (!owner) throw new NotFoundException('Service not found');
    if (owner.customer_id !== user.accountId && owner.provider_id !== user.accountId) {
      throw new ForbiddenException('Payment access denied');
    }
    return result.rows.map((row) => this.publicPayment(row));
  }

  private publicPayment(row: Record<string, unknown>) {
    return {
      id: row.id,
      serviceId: row.serviceId ?? row.service_id,
      method: row.method,
      expectedAmountCents: Number(row.expectedAmountCents ?? row.expected_amount_cents),
      confirmedAmountCents:
        row.confirmedAmountCents == null && row.confirmed_amount_cents == null
          ? null
          : Number(row.confirmedAmountCents ?? row.confirmed_amount_cents),
      currency: row.currency,
      status: row.status,
      externalReference: row.externalReference ?? row.external_reference ?? null,
      confirmedBy: row.confirmedBy ?? row.confirmed_by ?? null,
      confirmedAt: row.confirmedAt ?? row.confirmed_at ?? null,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
    };
  }

  private assertCustomer(user: AuthPrincipal) {
    if (user.role !== 'customer') throw new ForbiddenException('Customer role required');
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
        `${user.accountId}:${operation}:${key}`,
      ]);
      const existing = await client.query(
        `SELECT request_hash AS "requestHash",response_status AS "responseStatus",response_body AS "responseBody"
         FROM idempotency_keys WHERE account_id=$1 AND idempotency_key=$2 AND operation=$3 FOR UPDATE`,
        [user.accountId, key, operation],
      );
      if (existing.rowCount) {
        const row = existing.rows[0];
        if (row.requestHash !== requestHash) {
          throw new ConflictException('Idempotency-Key was already used with a different payload');
        }
        await client.query('COMMIT');
        return { status: row.responseStatus, body: row.responseBody as JsonObject };
      }
      const result = await work(client);
      await client.query(
        `INSERT INTO idempotency_keys
         (account_id,idempotency_key,operation,request_hash,response_status,response_body)
         VALUES ($1,$2,$3,$4,$5,$6)`,
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

  private async audit(client: PoolClient, actorId: string, eventType: string, paymentId: string, metadata: JsonObject) {
    await client.query(
      `INSERT INTO audit_events (actor_id,event_type,resource_type,resource_id,outcome,metadata)
       VALUES ($1,$2,'payment_record',$3,'success',$4)`,
      [actorId, eventType, paymentId, metadata],
    );
  }
}
