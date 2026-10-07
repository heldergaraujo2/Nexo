import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthPrincipal, UserRole } from '../auth/auth.types';
import { CreateFraudFlagDto, CreateIncidentDto, CreateVehicleDto, CreateVerificationDto, ReviewFraudFlagDto, ReviewVerificationDto, UpdateIncidentDto } from './dto';

@Injectable()
export class SecurityService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async createVehicle(user: AuthPrincipal, dto: CreateVehicleDto) {
    this.assertProvider(user);
    const plate = dto.plateLast4?.trim().toUpperCase();
    if (plate && !/^[A-Z0-9]{4}$/.test(plate)) throw new ConflictException('Invalid plate suffix');
    const result = await this.db.query(
      'INSERT INTO vehicles (provider_id,vehicle_type,make,model,model_year,plate_last4) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,vehicle_type AS "vehicleType",make,model,model_year AS "modelYear",plate_last4 AS "plateLast4",status,created_at AS "createdAt"',
      [user.accountId,dto.vehicleType,dto.make.trim(),dto.model.trim(),dto.modelYear ?? null,plate ?? null],
    );
    await this.event(user.accountId,'vehicle.created','vehicle',result.rows[0].id,'success','info',{});
    return result.rows[0];
  }

  async myVehicles(user: AuthPrincipal) {
    this.assertProvider(user);
    const result = await this.db.query(
      'SELECT id,vehicle_type AS "vehicleType",make,model,model_year AS "modelYear",plate_last4 AS "plateLast4",status,created_at AS "createdAt",updated_at AS "updatedAt" FROM vehicles WHERE provider_id=$1 ORDER BY created_at DESC',
      [user.accountId],
    );
    return result.rows;
  }

  async requestVerification(user: AuthPrincipal, dto: CreateVerificationDto) {
    this.assertModerator(user.role);
    await this.assertAccount(dto.accountId);
    if (dto.verificationType === 'vehicle') {
      if (!dto.vehicleId) throw new ConflictException('Vehicle verification requires a vehicle');
      const vehicle = await this.db.query('SELECT provider_id FROM vehicles WHERE id=$1',[dto.vehicleId]);
      if (!vehicle.rowCount || vehicle.rows[0].provider_id !== dto.accountId) throw new ForbiddenException('Vehicle ownership mismatch');
    }
    const result = await this.db.query(
      'INSERT INTO verification_cases (account_id,vehicle_id,verification_type,provider_name,external_reference) VALUES ($1,$2,$3,$4,$5) RETURNING id,account_id AS "accountId",vehicle_id AS "vehicleId",verification_type AS "verificationType",status,provider_name AS "providerName",external_reference AS "externalReference",created_at AS "createdAt"',
      [dto.accountId,dto.vehicleId ?? null,dto.verificationType,dto.providerName ?? 'manual',dto.externalReference ?? null],
    );
    await this.event(user.accountId,'verification.created','verification_case',result.rows[0].id,'success','info',{type:dto.verificationType});
    return result.rows[0];
  }

  async reviewVerification(user: AuthPrincipal, caseId: string, dto: ReviewVerificationDto) {
    this.assertModerator(user.role);
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT * FROM verification_cases WHERE id=$1 FOR UPDATE',[caseId]);
      const row = found.rows[0];
      if (!row) throw new NotFoundException('Verification case not found');
      await client.query(
        'UPDATE verification_cases SET status=$1,result_summary=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW() WHERE id=$4',
        [dto.status,dto.resultSummary ?? null,user.accountId,caseId],
      );
      if (row.verification_type === 'vehicle' && row.vehicle_id) {
        const vehicleStatus = dto.status === 'verified' ? 'verified' : dto.status === 'rejected' ? 'rejected' : 'pending_verification';
        await client.query('UPDATE vehicles SET status=$1,updated_at=NOW() WHERE id=$2',[vehicleStatus,row.vehicle_id]);
      }
      const label = dto.status === 'verified'
        ? (row.verification_type === 'identity' ? 'Identidade verificada' : 'Veículo verificado')
        : row.verification_type === 'identity' ? 'Identidade em revisão' : 'Veículo em revisão';
      await client.query(
        'INSERT INTO verification_indicators (account_id,verification_type,status,public_label) VALUES ($1,$2,$3,$4) ON CONFLICT (account_id,verification_type) DO UPDATE SET status=EXCLUDED.status,public_label=EXCLUDED.public_label,updated_at=NOW()',
        [row.account_id,row.verification_type,dto.status,label],
      );
      await client.query('COMMIT');
      await this.event(user.accountId,'verification.reviewed','verification_case',caseId,'success',dto.status === 'rejected' ? 'warning' : 'info',{});
      return {id:caseId,status:dto.status,resultSummary:dto.resultSummary ?? null};
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  }

  async createFraudFlag(user: AuthPrincipal, dto: CreateFraudFlagDto) {
    this.assertModerator(user.role);
    if (!dto.accountId && !dto.serviceId) throw new ConflictException('Account or service is required');
    if (dto.accountId) await this.assertAccount(dto.accountId);
    if (dto.serviceId) {
      const service = await this.db.query('SELECT 1 FROM services WHERE id=$1',[dto.serviceId]);
      if (!service.rowCount) throw new NotFoundException('Service not found');
    }
    const result = await this.db.query(
      'INSERT INTO fraud_flags (account_id,service_id,flag_type,severity,reason,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,account_id AS "accountId",service_id AS "serviceId",flag_type AS "flagType",severity,status,reason,created_at AS "createdAt"',
      [dto.accountId ?? null,dto.serviceId ?? null,dto.flagType,dto.severity,dto.reason,user.accountId],
    );
    await this.event(user.accountId,'fraud.flagged','fraud_flag',result.rows[0].id,'flagged',dto.severity,{flagType:dto.flagType});
    return result.rows[0];
  }

  async reviewFraudFlag(user: AuthPrincipal,id:string,dto:ReviewFraudFlagDto) {
    this.assertModerator(user.role);
    const client=await this.db.connect();
    try {
      await client.query('BEGIN');
      const current=await client.query('SELECT status FROM fraud_flags WHERE id=$1 FOR UPDATE',[id]);
      if (!current.rowCount) throw new NotFoundException('Fraud flag not found');
      const resolved=['resolved','dismissed'].includes(dto.status);
      const result=await client.query(
        'UPDATE fraud_flags SET status=$1,resolved_by=$2,resolved_at=CASE WHEN $3 THEN NOW() ELSE NULL END WHERE id=$4 RETURNING id,status,severity,resolved_at AS "resolvedAt"',
        [dto.status,resolved?user.accountId:null,resolved,id],
      );
      await client.query('COMMIT');
      await this.event(user.accountId,'fraud.reviewed','fraud_flag',id,'success',dto.status,{});
      return result.rows[0];
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async createIncident(user: AuthPrincipal,dto:CreateIncidentDto) {
    if (dto.serviceId) {
      const service=await this.db.query('SELECT customer_id,provider_id FROM services WHERE id=$1',[dto.serviceId]);
      const row=service.rows[0];
      if(!row) throw new NotFoundException('Service not found');
      if(row.customer_id!==user.accountId && row.provider_id!==user.accountId && !['admin','moderator'].includes(user.role)) throw new ForbiddenException('Incident access denied');
    }
    if (dto.safetyReportId) {
      const report=await this.db.query('SELECT reporter_id FROM safety_reports WHERE id=$1',[dto.safetyReportId]);
      if(!report.rowCount) throw new NotFoundException('Safety report not found');
      if(report.rows[0].reporter_id!==user.accountId && !['admin','moderator'].includes(user.role)) throw new ForbiddenException('Incident report access denied');
    }
    const result=await this.db.query(
      'INSERT INTO incident_cases (reporter_id,service_id,safety_report_id,category,severity,summary) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,service_id AS "serviceId",safety_report_id AS "safetyReportId",category,severity,status,summary,created_at AS "createdAt"',
      [user.accountId,dto.serviceId ?? null,dto.safetyReportId ?? null,dto.category,dto.severity,dto.summary],
    );
    await this.event(user.accountId,'incident.created','incident_case',result.rows[0].id,'success',dto.severity,{});
    return result.rows[0];
  }

  async listIncidents(user:AuthPrincipal) {
    this.assertModerator(user.role);
    const result=await this.db.query(
      'SELECT id,service_id AS "serviceId",safety_report_id AS "safetyReportId",category,severity,status,summary,assigned_to AS "assignedTo",resolution,created_at AS "createdAt",updated_at AS "updatedAt",resolved_at AS "resolvedAt" FROM incident_cases ORDER BY created_at DESC LIMIT 200',
      [],
    );
    return result.rows;
  }

  async updateIncident(user:AuthPrincipal,id:string,dto:UpdateIncidentDto) {
    this.assertModerator(user.role);
    const client=await this.db.connect();
    try {
      await client.query('BEGIN');
      const current=await client.query('SELECT status FROM incident_cases WHERE id=$1 FOR UPDATE',[id]);
      if(!current.rowCount) throw new NotFoundException('Incident not found');
      const allowed:Record<string,string[]>={open:['investigating','contained','resolved'],investigating:['contained','resolved'],contained:['resolved'],resolved:['closed'],closed:[]};
      if(!allowed[current.rows[0].status]?.includes(dto.status) && current.rows[0].status!==dto.status) throw new ConflictException('Invalid incident transition');
      const resolved=['resolved','closed'].includes(dto.status);
      const result=await client.query(
        'UPDATE incident_cases SET status=$1,assigned_to=COALESCE($2,assigned_to),resolution=COALESCE($3,resolution),resolved_at=CASE WHEN $4 THEN COALESCE(resolved_at,NOW()) ELSE NULL END,updated_at=NOW() WHERE id=$5 RETURNING id,status,assigned_to AS "assignedTo",resolution,resolved_at AS "resolvedAt"',
        [dto.status,dto.assignedTo ?? null,dto.resolution ?? null,resolved,id],
      );
      await client.query('COMMIT');
      await this.event(user.accountId,'incident.updated','incident_case',id,'success',dto.status,{});
      return result.rows[0];
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async securityEvents(user:AuthPrincipal) {
    this.assertModerator(user.role);
    const result=await this.db.query(
      'SELECT id,actor_id AS "actorId",event_type AS "eventType",severity,resource_type AS "resourceType",resource_id AS "resourceId",outcome,created_at AS "createdAt" FROM security_events ORDER BY created_at DESC LIMIT 200',
      [],
    );
    return result.rows;
  }

  private async assertAccount(id:string) {
    const result=await this.db.query("SELECT 1 FROM accounts WHERE id=$1 AND status='active'",[id]);
    if(!result.rowCount) throw new NotFoundException('Account not found');
  }
  private assertProvider(user:AuthPrincipal) { if(user.role!=='provider') throw new ForbiddenException('Provider role required'); }
  private assertModerator(role:UserRole) { if(role!=='admin' && role!=='moderator') throw new ForbiddenException('Moderator role required'); }
  private async event(actorId:string,eventType:string,resourceType:string,resourceId:string,outcome:string,severity:string,metadata:Record<string,unknown>) {
    await this.db.query(
      'INSERT INTO security_events (actor_id,event_type,resource_type,resource_id,outcome,severity,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [actorId,eventType,resourceType,resourceId,outcome,severity,metadata],
    );
  }
}