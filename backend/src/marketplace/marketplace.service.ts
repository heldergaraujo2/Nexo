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
import { RideService } from '../ride/ride.service';
import { DeliveryService } from '../delivery/delivery.service';
import { TowingService } from '../towing/towing.service';
import {
  CancelDto,
  CreateOfferDto,
  CreateServiceRequestDto,
  MarketplaceAvailabilityDto,
} from './dto';

type JsonObject = Record<string, unknown>;

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(Pool) private readonly db: Pool,
    @Inject(RideService) private readonly rides: RideService,
    @Inject(DeliveryService) private readonly deliveries: DeliveryService,
    @Inject(TowingService) private readonly towing: TowingService,
  ) {}

  async setAvailability(user: AuthPrincipal, dto: MarketplaceAvailabilityDto) {
    this.assertProvider(user);
    const result = await this.db.query(
      `INSERT INTO provider_marketplace
       (account_id,categories,availability,accepting_requests)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (account_id)
       DO UPDATE SET categories=EXCLUDED.categories,availability=EXCLUDED.availability,
                     accepting_requests=EXCLUDED.accepting_requests,updated_at=NOW()
       RETURNING account_id AS "accountId",categories,availability,"accepting_requests" AS "acceptingRequests",updated_at AS "updatedAt"`,
      [user.accountId, dto.categories, dto.availability, dto.acceptingRequests],
    );
    return result.rows[0];
  }

  async createRequest(
    user: AuthPrincipal,
    dto: CreateServiceRequestDto,
    idempotencyKey: string,
  ) {
    this.assertCustomer(user);
    return this.withIdempotency(
      user,
      'request.create',
      idempotencyKey,
      dto,
      async (client) => {
        const result = await client.query(
          `INSERT INTO service_requests
         (customer_id,category,description,requirements,origin,destination,status)
         VALUES ($1,$2,$3,$4,$5,$6,'open')
         RETURNING id,customer_id AS "customerId",category,description,requirements,origin,destination,
         status,expires_at AS "expiresAt",created_at AS "createdAt",updated_at AS "updatedAt"`,
          [
            user.accountId,
            dto.category,
            dto.description ?? null,
            dto.requirements ?? {},
            dto.origin ?? null,
            dto.destination ?? null,
          ],
        );
        const request = result.rows[0];
        await this.audit(
          client,
          user.accountId,
          'request.created',
          'service_request',
          request.id,
        );
        return { status: 201, body: request };
      },
    );
  }

  async getRequest(user: AuthPrincipal, requestId: string) {
    const result = await this.db.query(
      `SELECT id,customer_id AS "customerId",category,description,requirements,origin,destination,status,
       matched_provider_id AS "matchedProviderId",accepted_offer_id AS "acceptedOfferId",
       expires_at AS "expiresAt",created_at AS "createdAt",updated_at AS "updatedAt"
       FROM service_requests WHERE id=$1`,
      [requestId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Service request not found');
    if (
      row.customerId !== user.accountId &&
      row.matchedProviderId !== user.accountId
    ) {
      throw new ForbiddenException('Request access denied');
    }
    return row;
  }

  async matches(user: AuthPrincipal, requestId: string) {
    const request = await this.getOwnedRequest(user, requestId);
    if (request.customerId !== user.accountId)
      throw new ForbiddenException('Customer access required');

    const result = await this.db.query(
      `SELECT p.account_id AS "accountId",p.categories,p.availability,
              pr.display_name AS "displayName",pr.photo_url AS "photoUrl",pr.bio,
              COALESCE((
                SELECT AVG(r.score)::numeric(3,2)
                FROM ratings r
                WHERE r.subject_id=p.account_id AND r.moderation_state IN ('published','restored')
              ),0) AS "ratingAverage"
       FROM provider_marketplace p
       JOIN accounts a ON a.id=p.account_id AND a.status='active' AND a.role='provider'
       JOIN profiles pr ON pr.account_id=p.account_id
       WHERE p.availability='available'
         AND p.accepting_requests=true
         AND $1 = ANY(p.categories)
         AND p.account_id <> $2
         AND NOT EXISTS (
           SELECT 1 FROM blocks b
           WHERE (b.blocker_id=$2 AND b.blocked_id=p.account_id)
              OR (b.blocker_id=p.account_id AND b.blocked_id=$2)
         )
       ORDER BY "ratingAverage" DESC, p.updated_at DESC
       LIMIT 50`,
      [request.category, user.accountId],
    );
    return result.rows;
  }

  async createOffer(
    user: AuthPrincipal,
    requestId: string,
    dto: CreateOfferDto,
    idempotencyKey: string,
  ) {
    this.assertProvider(user);
    return this.withIdempotency(
      user,
      `offer.create:${requestId}`,
      idempotencyKey,
      dto,
      async (client) => {
        const request = await client.query(
          `SELECT id,customer_id,category,status,origin,destination,requirements FROM service_requests WHERE id=$1 FOR UPDATE`,
          [requestId],
        );
        const row = request.rows[0];
        if (!row) throw new NotFoundException('Service request not found');
        if (!['open', 'matched'].includes(row.status)) {
          throw new ConflictException('Request is not accepting offers');
        }
        await this.assertProviderEligible(
          client,
          user.accountId,
          row.category,
          row.customer_id,
        );

        const existing = await client.query(
          `SELECT id,request_id AS "requestId",provider_id AS "providerId",offer_type AS "offerType",
                amount_cents AS "amountCents",currency,message,status,expires_at AS "expiresAt",
                created_at AS "createdAt"
         FROM offers WHERE request_id=$1 AND provider_id=$2 AND status IN ('created','sent')
         LIMIT 1`,
          [requestId, user.accountId],
        );
        if (existing.rowCount) {
          throw new ConflictException(
            'Provider already has an active offer for this request',
          );
        }

        if (row.category === 'passenger_car' || row.category === 'passenger_motorcycle') {
          if (dto.offerType !== 'direct_accept') throw new ConflictException('Passenger transport does not allow price negotiation');
        }
        if ((row.category === 'delivery' || row.category === 'towing') && dto.offerType !== 'priced_offer') {
          throw new ConflictException('Delivery and towing acceptance require a priced offer');
        }
        if (dto.offerType === 'priced_offer' && dto.amountCents === undefined) {
          throw new ConflictException('Priced offers require amountCents');
        }
        const expiresAt = dto.expiresInMinutes
          ? new Date(Date.now() + dto.expiresInMinutes * 60_000)
          : null;
        const result = await client.query(
          `INSERT INTO offers
         (request_id,provider_id,offer_type,amount_cents,message,status,expires_at)
         VALUES ($1,$2,$3,$4,$5,'sent',$6)
         RETURNING id,request_id AS "requestId",provider_id AS "providerId",offer_type AS "offerType",
         amount_cents AS "amountCents",currency,message,status,expires_at AS "expiresAt",created_at AS "createdAt"`,
          [
            requestId,
            user.accountId,
            dto.offerType,
            dto.amountCents ?? null,
            dto.message ?? null,
            expiresAt,
          ],
        );
        const offer = result.rows[0];
        if (row.status === 'open') {
          await client.query(
            `UPDATE service_requests SET status='matched',matched_provider_id=$1,updated_at=NOW()
           WHERE id=$2`,
            [user.accountId, requestId],
          );
        }
        await this.notify(
          client,
          row.customer_id,
          'service_request.offer_received',
          {
            requestId,
            offerId: offer.id,
          },
        );
        await this.audit(
          client,
          user.accountId,
          'offer.created',
          'offer',
          offer.id,
        );
        return {
          status: 201,
          body: {
            ...offer,
            amountCents:
              offer.amountCents === null ? null : Number(offer.amountCents),
          },
        };
      },
    );
  }

  async acceptRequest(
    user: AuthPrincipal,
    requestId: string,
    idempotencyKey: string,
  ) {
    this.assertProvider(user);
    return this.withIdempotency(
      user,
      `request.accept:${requestId}`,
      idempotencyKey,
      {},
      async (client) => {
        const request = await client.query(
          `SELECT id,customer_id,category,status,matched_provider_id,origin,destination,requirements
         FROM service_requests WHERE id=$1 FOR UPDATE`,
          [requestId],
        );
        const row = request.rows[0];
        if (!row) throw new NotFoundException('Service request not found');
        if (!['open', 'matched'].includes(row.status)) {
          throw new ConflictException(
            'Request is not available for acceptance',
          );
        }
        if (row.category === 'delivery' || row.category === 'towing') {
          throw new ConflictException('This category must be accepted through a priced offer');
        }
        await this.assertProviderEligible(
          client,
          user.accountId,
          row.category,
          row.customer_id,
        );

        const activeService = await client.query(
          'SELECT 1 FROM services WHERE request_id=$1 FOR UPDATE',
          [requestId],
        );
        if (activeService.rowCount)
          throw new ConflictException('Request already has a service');

        const offer = await client.query(
          `INSERT INTO offers (request_id,provider_id,offer_type,status)
         VALUES ($1,$2,'direct_accept','accepted')
         RETURNING id`,
          [requestId, user.accountId],
        );
        const offerId = offer.rows[0].id;

        const service = await client.query(
          `INSERT INTO services
         (request_id,accepted_offer_id,customer_id,provider_id,category,status)
         VALUES ($1,$2,$3,$4,$5,'accepted')
         RETURNING id,request_id AS "requestId",customer_id AS "customerId",
         provider_id AS "providerId",category,status,created_at AS "createdAt"`,
          [requestId, offerId, row.customer_id, user.accountId, row.category],
        );
        if (row.category === 'passenger_car' || row.category === 'passenger_motorcycle') {
          const ride = await this.rides.createRideForService(
            client,
            service.rows[0].id,
            row.category === 'passenger_car' ? 'car' : 'motorcycle',
            row.origin,
            row.destination,
          );
          await client.query('UPDATE services SET price_cents=$1,currency=\'BRL\',updated_at=NOW() WHERE id=$2', [ride.fareCents, service.rows[0].id]);
          service.rows[0].priceCents = Number(ride.fareCents);
        }
        if (row.category === 'delivery') {
          await this.deliveries.createForService(client, service.rows[0].id, row);
        }
        if (row.category === 'towing') {
          await this.towing.createForService(client, service.rows[0].id, row);
        }
        await client.query(
          `UPDATE service_requests SET status='accepted',matched_provider_id=$1,accepted_offer_id=$2,updated_at=NOW()
         WHERE id=$3`,
          [user.accountId, offerId, requestId],
        );
        await client.query(
          `UPDATE offers SET status='rejected',updated_at=NOW()
         WHERE request_id=$1 AND id<>$2 AND status IN ('created','sent')`,
          [requestId, offerId],
        );
        await this.notify(client, row.customer_id, 'service_request.accepted', {
          requestId,
          serviceId: service.rows[0].id,
        });
        await this.audit(
          client,
          user.accountId,
          'request.accepted',
          'service_request',
          requestId,
        );
        return {
          status: 201,
          body: {
            ...service.rows[0],
            priceCents:
              service.rows[0].priceCents === null
                ? null
                : Number(service.rows[0].priceCents),
          },
        };
      },
    );
  }

  async acceptOffer(
    user: AuthPrincipal,
    offerId: string,
    idempotencyKey: string,
  ) {
    this.assertCustomer(user);
    return this.withIdempotency(
      user,
      `offer.accept:${offerId}`,
      idempotencyKey,
      {},
      async (client) => {
        const offerResult = await client.query(
          `SELECT o.id,o.request_id,o.provider_id,o.offer_type,o.amount_cents,o.currency,o.status,
                r.customer_id,r.category,r.status AS request_status,r.origin,r.destination,r.requirements
         FROM offers o JOIN service_requests r ON r.id=o.request_id
         WHERE o.id=$1 FOR UPDATE OF o`,
          [offerId],
        );
        const row = offerResult.rows[0];
        if (!row) throw new NotFoundException('Offer not found');
        if (row.customer_id !== user.accountId)
          throw new ForbiddenException('Offer access denied');
        const lockedRequest = await client.query(
          'SELECT id,customer_id,category,status,origin,destination FROM service_requests WHERE id=$1 FOR UPDATE',
          [row.request_id],
        );
        const requestRow = lockedRequest.rows[0];
        if (!requestRow || requestRow.customer_id !== user.accountId) {
          throw new ForbiddenException('Request access denied');
        }
        if (
          !['created', 'sent'].includes(row.status) ||
          !['open', 'matched'].includes(requestRow.status)
        ) {
          throw new ConflictException('Offer is not available for acceptance');
        }

        await this.assertProviderEligible(
          client,
          row.provider_id,
          row.category,
          row.customer_id,
        );
        if (row.category === 'passenger_car' || row.category === 'passenger_motorcycle') {
          throw new ConflictException('Passenger transport does not allow negotiated offers');
        }
        const service = await client.query(
          `INSERT INTO services
         (request_id,accepted_offer_id,customer_id,provider_id,category,status,price_cents,currency)
         VALUES ($1,$2,$3,$4,$5,'accepted',$6,$7)
         RETURNING id,request_id AS "requestId",customer_id AS "customerId",
         provider_id AS "providerId",category,status,price_cents AS "priceCents",
         currency,created_at AS "createdAt"`,
          [
            row.request_id,
            row.id,
            row.customer_id,
            row.provider_id,
            row.category,
            row.amount_cents,
            row.currency,
          ],
        );
        if (row.category === 'delivery') {
          await this.deliveries.createForService(client, service.rows[0].id, row);
        }
        if (row.category === 'towing') {
          await this.towing.createForService(client, service.rows[0].id, row);
        }
        await client.query(
          `UPDATE offers SET status='accepted',updated_at=NOW() WHERE id=$1`,
          [offerId],
        );
        await client.query(
          `UPDATE offers SET status='rejected',updated_at=NOW()
         WHERE request_id=$1 AND id<>$2 AND status IN ('created','sent')`,
          [row.request_id, offerId],
        );
        await client.query(
          `UPDATE service_requests SET status='accepted',matched_provider_id=$1,accepted_offer_id=$2,updated_at=NOW()
         WHERE id=$3`,
          [row.provider_id, offerId, row.request_id],
        );
        await this.notify(
          client,
          row.provider_id,
          'service_request.offer_accepted',
          {
            requestId: row.request_id,
            serviceId: service.rows[0].id,
          },
        );
        await this.audit(
          client,
          user.accountId,
          'offer.accepted',
          'offer',
          offerId,
        );
        return {
          status: 201,
          body: {
            ...service.rows[0],
            priceCents:
              service.rows[0].priceCents === null
                ? null
                : Number(service.rows[0].priceCents),
          },
        };
      },
    );
  }

  async cancelRequest(
    user: AuthPrincipal,
    requestId: string,
    idempotencyKey: string,
    dto: CancelDto = {},
  ) {
    return this.withIdempotency(
      user,
      `request.cancel:${requestId}`,
      idempotencyKey,
      dto,
      async (client) => {
        const result = await client.query(
          `SELECT id,customer_id,matched_provider_id,status
           FROM service_requests WHERE id=$1 FOR UPDATE`,
          [requestId],
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundException('Service request not found');
        if (
          row.customer_id !== user.accountId &&
          row.matched_provider_id !== user.accountId
        ) {
          throw new ForbiddenException('Request access denied');
        }
        if (!['open', 'matched'].includes(row.status)) {
          throw new ConflictException(
            'Request cannot be cancelled in its current state',
          );
        }
        const updated = await client.query(
          `UPDATE service_requests SET status='cancelled',updated_at=NOW()
           WHERE id=$1
           RETURNING id,status,updated_at AS "updatedAt"`,
          [requestId],
        );
        const recipient =
          row.customer_id === user.accountId
            ? row.matched_provider_id
            : row.customer_id;
        if (recipient) {
          await this.notify(client, recipient, 'service_request.cancelled', {
            requestId,
            reason: dto.reason ?? null,
          });
        }
        await this.audit(
          client,
          user.accountId,
          'request.cancelled',
          'service_request',
          requestId,
        );
        return {
          status: 200,
          body: {
            ...updated.rows[0],
            priceCents:
              updated.rows[0].priceCents === null
                ? null
                : Number(updated.rows[0].priceCents),
          },
        };
      },
    );
  }

  async rejectOffer(
    user: AuthPrincipal,
    offerId: string,
    idempotencyKey: string,
  ) {
    this.assertCustomer(user);
    return this.withIdempotency(
      user,
      `offer.reject:${offerId}`,
      idempotencyKey,
      {},
      async (client) => {
        const result = await client.query(
          `SELECT o.id,o.provider_id,o.request_id,o.status,r.customer_id,r.status AS request_status
         FROM offers o JOIN service_requests r ON r.id=o.request_id
         WHERE o.id=$1 FOR UPDATE OF o`,
          [offerId],
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundException('Offer not found');
        if (row.customer_id !== user.accountId)
          throw new ForbiddenException('Offer access denied');
        if (!['created', 'sent'].includes(row.status)) {
          throw new ConflictException('Offer cannot be rejected');
        }
        await client.query(
          `UPDATE offers SET status='rejected',updated_at=NOW() WHERE id=$1`,
          [offerId],
        );
        await this.audit(
          client,
          user.accountId,
          'offer.rejected',
          'offer',
          offerId,
        );
        return { status: 200, body: { id: offerId, status: 'rejected' } };
      },
    );
  }

  async withdrawOffer(
    user: AuthPrincipal,
    offerId: string,
    idempotencyKey: string,
  ) {
    this.assertProvider(user);
    return this.withIdempotency(
      user,
      `offer.withdraw:${offerId}`,
      idempotencyKey,
      {},
      async (client) => {
        const result = await client.query(
          `SELECT o.id,o.provider_id,o.status,r.customer_id
         FROM offers o JOIN service_requests r ON r.id=o.request_id
         WHERE o.id=$1 FOR UPDATE OF o`,
          [offerId],
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundException('Offer not found');
        if (row.provider_id !== user.accountId)
          throw new ForbiddenException('Offer access denied');
        if (!['created', 'sent'].includes(row.status)) {
          throw new ConflictException('Offer cannot be withdrawn');
        }
        await client.query(
          `UPDATE offers SET status='withdrawn',updated_at=NOW() WHERE id=$1`,
          [offerId],
        );
        await this.audit(
          client,
          user.accountId,
          'offer.withdrawn',
          'offer',
          offerId,
        );
        return { status: 200, body: { id: offerId, status: 'withdrawn' } };
      },
    );
  }

  async listOffers(user: AuthPrincipal, requestId: string) {
    const request = await this.getOwnedRequest(user, requestId);
    const result = await this.db.query(
      `SELECT o.id,o.request_id AS "requestId",o.provider_id AS "providerId",
              o.offer_type AS "offerType",o.amount_cents AS "amountCents",o.currency,
              o.message,o.status,o.expires_at AS "expiresAt",o.created_at AS "createdAt",
              p.display_name AS "providerName",p.photo_url AS "providerPhotoUrl"
       FROM offers o JOIN profiles p ON p.account_id=o.provider_id
       WHERE o.request_id=$1
         AND ($2 = o.provider_id OR $2 = $3)
       ORDER BY o.created_at DESC`,
      [requestId, user.accountId, request.customerId],
    );
    return result.rows;
  }

  async getService(user: AuthPrincipal, serviceId: string) {
    const result = await this.db.query(
      `SELECT id,request_id AS "requestId",customer_id AS "customerId",provider_id AS "providerId",
              category,status,price_cents AS "priceCents",currency,created_at AS "createdAt",
              updated_at AS "updatedAt",completed_at AS "completedAt"
       FROM services WHERE id=$1`,
      [serviceId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Service not found');
    if (
      row.customerId !== user.accountId &&
      row.providerId !== user.accountId
    ) {
      throw new ForbiddenException('Service access denied');
    }
    return row;
  }

  async transitionService(
    user: AuthPrincipal,
    serviceId: string,
    action: 'start' | 'complete' | 'cancel',
    idempotencyKey: string,
    dto: CancelDto = {},
  ) {
    return this.withIdempotency(
      user,
      `service.${action}:${serviceId}`,
      idempotencyKey,
      dto,
      async (client) => {
        const result = await client.query(
          `SELECT id,request_id,customer_id,provider_id,status FROM services WHERE id=$1 FOR UPDATE`,
          [serviceId],
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundException('Service not found');
        if (
          row.customer_id !== user.accountId &&
          row.provider_id !== user.accountId
        ) {
          throw new ForbiddenException('Service access denied');
        }
        if (row.category === 'delivery' || row.category === 'towing') {
          throw new ConflictException('Category execution must use its dedicated state machine');
        }

        const transitions: Record<string, string[]> = {
          start: ['accepted'],
          complete: ['in_progress'],
          cancel: ['accepted', 'in_progress'],
        };
        const allowedStates = transitions[action];
        if (!allowedStates || !allowedStates.includes(row.status)) {
          throw new ConflictException('Invalid service state transition');
        }
        if (action === 'start' && row.provider_id !== user.accountId) {
          throw new ForbiddenException('Only the provider can start a service');
        }
        if (action === 'complete' && row.provider_id !== user.accountId) {
          throw new ForbiddenException(
            'Only the provider can complete a service',
          );
        }

        const nextStatus =
          action === 'start'
            ? 'in_progress'
            : action === 'complete'
              ? 'completed'
              : 'cancelled';
        const updated = await client.query(
          `UPDATE services SET status=$1,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,
           updated_at=NOW() WHERE id=$2
           RETURNING id,request_id AS "requestId",customer_id AS "customerId",provider_id AS "providerId",
           category,status,price_cents AS "priceCents",currency,created_at AS "createdAt",
           updated_at AS "updatedAt",completed_at AS "completedAt"`,
          [nextStatus, serviceId],
        );
        if (row.request_id) {
          await client.query(
            `UPDATE service_requests SET status=$1,updated_at=NOW() WHERE id=$2`,
            [nextStatus, row.request_id],
          );
        }
        await this.notify(
          client,
          row.customer_id === user.accountId
            ? row.provider_id
            : row.customer_id,
          `service.${action}`,
          { serviceId, requestId: row.request_id, reason: dto.reason ?? null },
        );
        await this.audit(
          client,
          user.accountId,
          `service.${action}`,
          'service',
          serviceId,
        );
        return { status: 200, body: updated.rows[0] };
      },
    );
  }

  async history(user: AuthPrincipal) {
    const result = await this.db.query(
      `SELECT id,request_id AS "requestId",customer_id AS "customerId",provider_id AS "providerId",
              category,status,price_cents AS "priceCents",currency,created_at AS "createdAt",
              updated_at AS "updatedAt",completed_at AS "completedAt"
       FROM services
       WHERE customer_id=$1 OR provider_id=$1
       ORDER BY created_at DESC LIMIT 100`,
      [user.accountId],
    );
    return result.rows;
  }

  async notifications(user: AuthPrincipal) {
    const result = await this.db.query(
      `SELECT id,type,payload,"read_at" AS "readAt",created_at AS "createdAt"
       FROM notifications WHERE recipient_id=$1
       ORDER BY created_at DESC LIMIT 100`,
      [user.accountId],
    );
    return result.rows;
  }

  private async getOwnedRequest(user: AuthPrincipal, requestId: string) {
    const result = await this.db.query(
      `SELECT id,customer_id AS "customerId",category,status,matched_provider_id AS "matchedProviderId",
              accepted_offer_id AS "acceptedOfferId"
       FROM service_requests WHERE id=$1`,
      [requestId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Service request not found');
    if (
      row.customerId !== user.accountId &&
      row.matchedProviderId !== user.accountId
    ) {
      throw new ForbiddenException('Request access denied');
    }
    return row;
  }

  private async assertProviderEligible(
    client: PoolClient,
    providerId: string,
    category: string,
    customerId: string,
  ) {
    const provider = await client.query(
      `SELECT a.id FROM accounts a
       JOIN provider_marketplace p ON p.account_id=a.id
       WHERE a.id=$1 AND a.role='provider' AND a.status='active'
         AND p.availability IN ('available','busy')
         AND p.accepting_requests=true
         AND $2 = ANY(p.categories)
         AND a.id<>$3`,
      [providerId, category, customerId],
    );
    if (!provider.rowCount)
      throw new ForbiddenException('Provider is not eligible for this request');

    const subscription = await client.query(
      "SELECT status FROM subscriptions WHERE provider_id=$1 ORDER BY created_at DESC LIMIT 1",
      [providerId],
    );
    if (subscription.rowCount && subscription.rows[0].status !== 'active') {
      throw new ForbiddenException('Provider subscription is not active');
    }

    const blocked = await client.query(
      `SELECT 1 FROM blocks
       WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)`,
      [providerId, customerId],
    );
    if (blocked.rowCount)
      throw new ForbiddenException('Participants are blocked');

    if (category === 'towing') {
      const verifiedVehicle = await client.query(
        "SELECT 1 FROM vehicles WHERE provider_id=$1 AND status='verified' LIMIT 1",
        [providerId],
      );
      if (!verifiedVehicle.rowCount) {
        throw new ForbiddenException('Towing provider requires a verified vehicle');
      }
    }
  }

  private assertCustomer(user: AuthPrincipal) {
    if (user.role !== 'customer')
      throw new ForbiddenException('Customer role required');
  }

  private assertProvider(user: AuthPrincipal) {
    if (user.role !== 'provider')
      throw new ForbiddenException('Provider role required');
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
      `INSERT INTO audit_events
       (actor_id,event_type,resource_type,resource_id,outcome,metadata)
       VALUES ($1,$2,$3,$4,'success','{}'::jsonb)`,
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
          throw new ConflictException(
            'Idempotency-Key was already used with a different payload',
          );
        }
        await client.query('COMMIT');
        return {
          status: row.responseStatus,
          body: row.responseBody as JsonObject,
        };
      }
      const result = await work(client);
      await client.query(
        `INSERT INTO idempotency_keys
         (account_id,idempotency_key,operation,request_hash,response_status,response_body)
         VALUES ($1,$2,$3,$4,$5,$6)`,
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
