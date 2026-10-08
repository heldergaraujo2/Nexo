import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { createHash } from 'node:crypto';
import { AuthPrincipal } from '../auth/auth.types';
import { CreatePassengerRideDto, ChangeRideRouteDto } from './dto';
import { Coordinate, HaversineDistanceAdapter } from './distance.adapter';

type JsonObject = Record<string, unknown>;

type RideState = 'accepted' | 'driver_en_route' | 'arrived' | 'started' | 'completed' | 'cancelled';

const TARIFF_CENTS_PER_KM = { car: 200, motorcycle: 150 } as const;

@Injectable()
export class RideService {
  constructor(
    @Inject(Pool) private readonly db: Pool,
  ) {
    this.distanceAdapter = new HaversineDistanceAdapter();
  }

  private readonly distanceAdapter: HaversineDistanceAdapter;

  async createRequest(user: AuthPrincipal, dto: CreatePassengerRideDto, key: string) {
    if (user.role !== 'customer') throw new ForbiddenException('Customer role required');
    const origin = this.normalizeCoordinate(dto.origin);
    const destination = this.normalizeCoordinate(dto.destination);
    return this.withIdempotency(
      user,
      'ride.request.create',
      key,
      dto,
      async (client) => {
        const distanceMeters = this.distanceAdapter.distanceMeters(origin, destination);
        const tariff = TARIFF_CENTS_PER_KM[dto.vehicleType];
        const fareCents = Math.floor((distanceMeters * tariff + 50) / 100);
        const request = await client.query(
          `INSERT INTO service_requests (customer_id,category,requirements,origin,destination,status,expires_at)
           VALUES ($1,$2,$3,$4,$5,'open',NOW()+INTERVAL '5 minutes')
           RETURNING id`,
          [
            user.accountId,
            `passenger_${dto.vehicleType}`,
            { vehicleType: dto.vehicleType },
            origin,
            destination,
          ],
        );
        const row = request.rows[0];
        await this.audit(client, user.accountId, 'ride.request_created', 'service_request', row.id);
        return {
          status: 201,
          body: {
            requestId: row.id,
            category: `passenger_${dto.vehicleType}`,
            origin,
            destination,
            distanceMeters,
            tariffCentsPerKm: tariff,
            fareCents,
            currency: 'BRL',
          },
        };
      },
    );
  }

  async createRideForService(client: PoolClient, serviceId: string, vehicleType: 'car' | 'motorcycle', origin: unknown, destination: unknown) {
    const o = this.normalizeCoordinate(origin);
    const d = this.normalizeCoordinate(destination);
    const distanceMeters = this.distanceAdapter.distanceMeters(o, d);
    const tariff = TARIFF_CENTS_PER_KM[vehicleType];
    const fareCents = Math.floor((distanceMeters * tariff + 50) / 100);
    const result = await client.query(
      `INSERT INTO rides (service_id,vehicle_type,origin,destination,distance_meters,tariff_cents_per_km,fare_cents)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,service_id AS "serviceId",vehicle_type AS "vehicleType",origin,destination,
       distance_meters AS "distanceMeters",tariff_cents_per_km AS "tariffCentsPerKm",
       fare_cents AS "fareCents",currency,state,route_version AS "routeVersion",
       created_at AS "createdAt"`,
      [serviceId, vehicleType, o, d, distanceMeters, tariff, fareCents],
    );
    await client.query(
      `INSERT INTO ride_route_snapshots
       (ride_id,version,origin,destination,distance_meters,tariff_cents_per_km,fare_cents,currency,reason)
       VALUES ($1,1,$2,$3,$4,$5,$6,'BRL','initial_calculation')`,
      [result.rows[0].id, o, d, distanceMeters, tariff, fareCents],
    );
    return result.rows[0];
  }

  async updateDriverLocation(
    user: AuthPrincipal,
    rideId: string,
    dto: { latitude: number; longitude: number; speedMetersPerSecond?: number; headingDegrees?: number },
    key: string,
  ) {
    if (user.role !== 'provider') throw new ForbiddenException('Only the driver can update location');
    if (!key || key.length > 128) throw new ConflictException('Valid Idempotency-Key is required');
    const latitude = Number(dto.latitude);
    const longitude = Number(dto.longitude);
    const speed = dto.speedMetersPerSecond == null ? null : Number(dto.speedMetersPerSecond);
    const heading = dto.headingDegrees == null ? null : Number(dto.headingDegrees);
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      (speed !== null && (!Number.isFinite(speed) || speed < 0)) ||
      (heading !== null && (!Number.isFinite(heading) || heading < 0 || heading >= 360))
    ) {
      throw new ConflictException('Invalid driver location');
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `ride-location:${user.accountId}:${rideId}:${key}`,
      ]);
      const result = await client.query(
        `SELECT r.id,r.state,s.provider_id FROM rides r
         JOIN services s ON s.id=r.service_id WHERE r.id=$1 FOR UPDATE`,
        [rideId],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Ride not found');
      if (row.provider_id !== user.accountId) throw new ForbiddenException('Ride access denied');
      if (!['accepted', 'driver_en_route', 'arrived', 'started'].includes(row.state)) {
        throw new ConflictException('Driver location cannot be updated in this state');
      }
      const updated = await client.query(
        `UPDATE rides
         SET driver_latitude=$1,driver_longitude=$2,driver_speed_mps=$3,
             driver_heading_degrees=$4,driver_location_updated_at=NOW(),updated_at=NOW()
         WHERE id=$5
         RETURNING id,driver_latitude AS "latitude",driver_longitude AS "longitude",
                   driver_speed_mps AS "speedMetersPerSecond",
                   driver_heading_degrees AS "headingDegrees",
                   driver_location_updated_at AS "updatedAt"`,
        [latitude, longitude, speed, heading, rideId],
      );
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async get(user: AuthPrincipal, rideId: string) {
    const result = await this.db.query(
      `SELECT r.*,s.customer_id AS "customerId",s.provider_id AS "providerId"
       FROM rides r JOIN services s ON s.id=r.service_id WHERE r.id=$1`,
      [rideId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Ride not found');
    if (row.customerId !== user.accountId && row.providerId !== user.accountId) {
      throw new ForbiddenException('Ride access denied');
    }
    return this.publicRide(row);
  }

  async transition(user: AuthPrincipal, rideId: string, next: RideState, key: string, reason?: string) {
    if (!key) throw new ConflictException('Valid Idempotency-Key is required');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT r.*,r.id,r.state,r.service_id,s.customer_id,s.provider_id
         FROM rides r JOIN services s ON s.id=r.service_id WHERE r.id=$1 FOR UPDATE`,
        [rideId],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Ride not found');
      if (row.customer_id !== user.accountId && row.provider_id !== user.accountId) {
        throw new ForbiddenException('Ride access denied');
      }
      const allowed: Record<string, RideState[]> = {
        driver_en_route: ['accepted'],
        arrived: ['driver_en_route'],
        started: ['arrived'],
        completed: ['started'],
        cancelled: ['accepted','driver_en_route','arrived'],
      };
      if (!allowed[next]?.includes(row.state)) throw new ConflictException('Invalid ride state transition');
      if (next !== 'cancelled' && user.accountId !== row.provider_id) {
        throw new ForbiddenException('Only the driver can advance the ride');
      }
      if (next === 'cancelled' && row.state === 'started') {
        throw new ConflictException('Started rides cannot be cancelled');
      }
      const updated = await client.query(
        `UPDATE rides SET state=$1,started_at=CASE WHEN $1='started' THEN NOW() ELSE started_at END,
         completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,updated_at=NOW()
         WHERE id=$2
         RETURNING id,state,route_version AS "routeVersion",fare_cents AS "fareCents",
         distance_meters AS "distanceMeters",updated_at AS "updatedAt"`,
        [next, rideId],
      );
      await client.query(
        `UPDATE services SET status=$1,completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,updated_at=NOW()
         WHERE id=$2`,
        [next === 'started' ? 'in_progress' : next === 'completed' ? 'completed' : next === 'cancelled' ? 'cancelled' : 'accepted', row.service_id],
      );
      await client.query(
        `INSERT INTO ride_events (ride_id,actor_id,from_state,to_state,reason) VALUES ($1,$2,$3,$4,$5)`,
        [rideId,user.accountId,row.state,next,reason ?? null],
      );
      const recipientId = row.customer_id === user.accountId ? row.provider_id : row.customer_id;
      if (recipientId) {
        await client.query(
          'INSERT INTO notifications (recipient_id,type,payload) VALUES ($1,$2,$3)',
          [recipientId, `ride.${next}`, { rideId, state: next }],
        );
      }
      await client.query('COMMIT');
      return this.publicRide(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async changeRoute(user: AuthPrincipal, rideId: string, dto: ChangeRideRouteDto, key: string) {
    if (user.role !== 'provider') throw new ForbiddenException('Only the driver can change the route');
    if (!key) throw new ConflictException('Valid Idempotency-Key is required');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT r.*,s.provider_id FROM rides r JOIN services s ON s.id=r.service_id WHERE r.id=$1 FOR UPDATE`,
        [rideId],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Ride not found');
      if (row.provider_id !== user.accountId) throw new ForbiddenException('Ride access denied');
      if (row.route_version !== dto.expectedRouteVersion) throw new ConflictException('Route version is stale');
      if (!['accepted','driver_en_route','arrived','started'].includes(row.state)) throw new ConflictException('Route cannot be changed in this state');
      const o = this.normalizeCoordinate(dto.origin);
      const d = this.normalizeCoordinate(dto.destination);
      const distanceMeters = this.distanceAdapter.distanceMeters(o,d);
      const tariff = Number(row.tariff_cents_per_km);
      const fareCents = Math.floor((distanceMeters * tariff + 50) / 100);
      const version = row.route_version + 1;
      await client.query(
        `UPDATE rides SET origin=$1,destination=$2,distance_meters=$3,fare_cents=$4,route_version=$5,updated_at=NOW() WHERE id=$6`,
        [o,d,distanceMeters,fareCents,version,rideId],
      );
      await client.query(
        `UPDATE services SET price_cents=$1,currency=$2,updated_at=NOW() WHERE id=$3`,
        [fareCents, row.currency, row.service_id],
      );
      await client.query(
        `INSERT INTO ride_route_snapshots (ride_id,version,origin,destination,distance_meters,tariff_cents_per_km,fare_cents,currency,reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'BRL','route_change')`,
        [rideId,version,o,d,distanceMeters,tariff,fareCents],
      );
      await client.query(
        `INSERT INTO ride_events (ride_id,actor_id,from_state,to_state,reason) VALUES ($1,$2,$3,$3,$4)`,
        [rideId,user.accountId,row.state,'route_change'],
      );
      await client.query('COMMIT');
      return this.get(user, rideId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private normalizeCoordinate(value: unknown): Coordinate {
    if (!value || typeof value !== 'object') throw new ConflictException('Invalid coordinates');
    const row = value as Record<string, unknown>;
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new ConflictException('Invalid coordinates');
    }
    return { latitude, longitude };
  }


  private publicRide(row: Record<string, unknown>) {
    const value = (key: string) => row[key];
    return {
      id: value('id'),
      serviceId: value('serviceId') ?? value('service_id'),
      vehicleType: value('vehicleType') ?? value('vehicle_type'),
      origin: value('origin'),
      destination: value('destination'),
      distanceMeters: Number(value('distanceMeters') ?? value('distance_meters')),
      tariffCentsPerKm: Number(value('tariffCentsPerKm') ?? value('tariff_cents_per_km')),
      fareCents: Number(value('fareCents') ?? value('fare_cents')),
      currency: value('currency'),
      state: value('state'),
      routeVersion: Number(value('routeVersion') ?? value('route_version')),
      startedAt: value('started_at') ?? value('startedAt') ?? null,
      completedAt: value('completed_at') ?? value('completedAt') ?? null,
      updatedAt: value('updated_at') ?? value('updatedAt') ?? null,
      driverLocation: value('driverLocation') ?? (value('driver_latitude') == null ? null : {
        latitude: Number(value('driver_latitude')),
        longitude: Number(value('driver_longitude')),
        speedMetersPerSecond: value('driver_speed_mps') == null ? null : Number(value('driver_speed_mps')),
        headingDegrees: value('driver_heading_degrees') == null ? null : Number(value('driver_heading_degrees')),
        updatedAt: value('driver_location_updated_at') ?? null,
      }),
    };
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
        if (row.requestHash !== requestHash) throw new ConflictException('Idempotency-Key was already used with a different payload');
        await client.query('COMMIT');
        return { status: row.responseStatus, body: row.responseBody as JsonObject };
      }
      const result = await work(client);
      await client.query(
        `INSERT INTO idempotency_keys (account_id,idempotency_key,operation,request_hash,response_status,response_body)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [user.accountId,key,operation,requestHash,result.status,result.body],
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


  private async audit(client: PoolClient, actorId: string, eventType: string, resourceType: string, resourceId: string) {
    await client.query(
      `INSERT INTO audit_events (actor_id,event_type,resource_type,resource_id,outcome,metadata)
       VALUES ($1,$2,$3,$4,'success','{}'::jsonb)`,
      [actorId,eventType,resourceType,resourceId],
    );
  }
}
