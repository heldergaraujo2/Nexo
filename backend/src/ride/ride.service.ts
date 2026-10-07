import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import { CreatePassengerRideDto, ChangeRideRouteDto } from './dto';

type RideState = 'accepted' | 'driver_en_route' | 'arrived' | 'started' | 'completed' | 'cancelled';

const TARIFF_CENTS_PER_KM = { car: 200, motorcycle: 150 } as const;

@Injectable()
export class RideService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async createRequest(user: AuthPrincipal, dto: CreatePassengerRideDto, key: string) {
    if (user.role !== 'customer') throw new ForbiddenException('Customer role required');
    if (!key) throw new ConflictException('Valid Idempotency-Key is required');
    const origin = this.normalizeCoordinate(dto.origin);
    const destination = this.normalizeCoordinate(dto.destination);
    const distanceMeters = this.distanceMeters(origin, destination);
    const tariff = TARIFF_CENTS_PER_KM[dto.vehicleType];
    const fareCents = Math.floor((distanceMeters * tariff + 50) / 100);
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const request = await client.query(
        `INSERT INTO service_requests (customer_id,category,requirements,origin,destination,status)
         VALUES ($1,$2,$3,$4,$5,'open')
         RETURNING id`,
        [user.accountId, `passenger_${dto.vehicleType}`, { vehicleType: dto.vehicleType }, origin, destination],
      );
      const row = request.rows[0];
      await this.audit(client, user.accountId, 'ride.request_created', 'service_request', row.id);
      await client.query('COMMIT');
      return { requestId: row.id, category: `passenger_${dto.vehicleType}`, origin, destination, distanceMeters, tariffCentsPerKm: tariff, fareCents, currency: 'BRL' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createRideForService(client: PoolClient, serviceId: string, vehicleType: 'car' | 'motorcycle', origin: unknown, destination: unknown) {
    const o = this.normalizeCoordinate(origin);
    const d = this.normalizeCoordinate(destination);
    const distanceMeters = this.distanceMeters(o, d);
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
        `SELECT r.id,r.state,r.service_id,s.customer_id,s.provider_id
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
      const distanceMeters = this.distanceMeters(o,d);
      const tariff = Number(row.tariff_cents_per_km);
      const fareCents = Math.floor((distanceMeters * tariff + 50) / 100);
      const version = row.route_version + 1;
      await client.query(
        `UPDATE rides SET origin=$1,destination=$2,distance_meters=$3,fare_cents=$4,route_version=$5,updated_at=NOW() WHERE id=$6`,
        [o,d,distanceMeters,fareCents,version,rideId],
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

  private normalizeCoordinate(value: unknown) {
    if (!value || typeof value !== 'object') throw new ConflictException('Invalid coordinates');
    const row = value as Record<string, unknown>;
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new ConflictException('Invalid coordinates');
    }
    return { latitude, longitude };
  }

  private distanceMeters(a: { latitude:number;longitude:number }, b:{latitude:number;longitude:number}) {
    const R = 6371000;
    const p1 = a.latitude * Math.PI / 180;
    const p2 = b.latitude * Math.PI / 180;
    const dp = (b.latitude-a.latitude) * Math.PI / 180;
    const dl = (b.longitude-a.longitude) * Math.PI / 180;
    const h = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }

  private publicRide(row: Record<string, any>) {
    return {
      id: row.id, serviceId: row.serviceId ?? row.service_id, vehicleType: row.vehicleType ?? row.vehicle_type,
      origin: row.origin, destination: row.destination, distanceMeters: Number(row.distanceMeters ?? row.distance_meters),
      tariffCentsPerKm: Number(row.tariffCentsPerKm ?? row.tariff_cents_per_km), fareCents: Number(row.fareCents ?? row.fare_cents),
      currency: row.currency, state: row.state, routeVersion: Number(row.routeVersion ?? row.route_version),
      startedAt: row.started_at ?? row.startedAt ?? null, completedAt: row.completed_at ?? row.completedAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  }

  private async audit(client: PoolClient, actorId: string, eventType: string, resourceType: string, resourceId: string) {
    await client.query(
      `INSERT INTO audit_events (actor_id,event_type,resource_type,resource_id,outcome,metadata)
       VALUES ($1,$2,$3,$4,'success','{}'::jsonb)`,
      [actorId,eventType,resourceType,resourceId],
    );
  }
}
