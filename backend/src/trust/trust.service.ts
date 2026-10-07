import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { AuthPrincipal, UserRole } from '../auth/auth.types';
import {
  CreateFavoriteDto,
  CreateRatingDto,
  CreateReportDto,
  ModerateRatingDto,
  ModerateReportDto,
  SetVerificationDto,
} from './dto';

@Injectable()
export class TrustService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async rate(user: AuthPrincipal, dto: CreateRatingDto) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const service = await client.query<{
        customer_id: string;
        provider_id: string;
        status: string;
      }>(
        'SELECT customer_id,provider_id,status FROM services WHERE id=$1 FOR SHARE',
        [dto.serviceId],
      );
      const row = service.rows[0];
      if (!row || row.status !== 'completed') {
        throw new ConflictException('Service is not eligible for rating');
      }

      const validPair =
        (row.customer_id === user.accountId && row.provider_id === dto.subjectId) ||
        (row.provider_id === user.accountId && row.customer_id === dto.subjectId);
      if (!validPair) {
        throw new ForbiddenException('Rating relationship is not allowed');
      }

      const inserted = await client.query(
        `INSERT INTO ratings (service_id,author_id,subject_id,score,comment)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id,service_id AS "serviceId",author_id AS "authorId",subject_id AS "subjectId",
         score,comment,moderation_state AS "moderationState",created_at AS "createdAt"`,
        [dto.serviceId, user.accountId, dto.subjectId, dto.score, dto.comment ?? null],
      );
      const rating = inserted.rows[0];
      await this.audit(client, user.accountId, 'rating.created', 'rating', rating.id, 'success');
      await client.query('COMMIT');
      return rating;
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Rating already exists for this service');
      throw error;
    } finally {
      client.release();
    }
  }

  async ratings(accountId: string) {
    const result = await this.db.query(
      `SELECT id,service_id AS "serviceId",author_id AS "authorId",subject_id AS "subjectId",
       score,comment,created_at AS "createdAt"
       FROM ratings
       WHERE subject_id=$1 AND moderation_state IN ('published','restored')
       ORDER BY created_at DESC`,
      [accountId],
    );
    const summary = await this.db.query<{ average: string | null; total: string }>(
      `SELECT AVG(score)::numeric(3,2) AS average, COUNT(*)::text AS total
       FROM ratings WHERE subject_id=$1 AND moderation_state IN ('published','restored')`,
      [accountId],
    );
    return {
      average: summary.rows[0]?.average ?? null,
      total: Number(summary.rows[0]?.total ?? 0),
      ratings: result.rows,
    };
  }

  async favorite(user: AuthPrincipal, dto: CreateFavoriteDto) {
    if (user.accountId === dto.targetAccountId) {
      throw new ConflictException('Cannot favorite own profile');
    }
    await this.assertAccountExists(dto.targetAccountId);
    await this.db.query(
      'INSERT INTO favorites (account_id,target_account_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [user.accountId, dto.targetAccountId],
    );
    return { targetAccountId: dto.targetAccountId, favorited: true };
  }

  async unfavorite(user: AuthPrincipal, targetAccountId: string) {
    await this.db.query(
      'DELETE FROM favorites WHERE account_id=$1 AND target_account_id=$2',
      [user.accountId, targetAccountId],
    );
    return { targetAccountId, favorited: false };
  }

  async favorites(user: AuthPrincipal) {
    const result = await this.db.query(
      `SELECT p.account_id AS "accountId",p.display_name AS "displayName",p.photo_url AS "photoUrl",
       p.bio,p.professional_info AS "professionalInfo",f.created_at AS "favoritedAt"
       FROM favorites f JOIN profiles p ON p.account_id=f.target_account_id
       JOIN accounts a ON a.id=p.account_id
       WHERE f.account_id=$1 AND a.status='active' ORDER BY f.created_at DESC`,
      [user.accountId],
    );
    return result.rows;
  }

  async report(user: AuthPrincipal, dto: CreateReportDto) {
    if (dto.targetAccountId === user.accountId) {
      throw new ConflictException('Cannot report own account');
    }
    if (!dto.targetAccountId && !dto.serviceId) {
      throw new ConflictException('A report target is required');
    }
    if (dto.targetAccountId) await this.assertAccountExists(dto.targetAccountId);
    if (dto.serviceId) {
      const service = await this.db.query('SELECT 1 FROM services WHERE id=$1', [dto.serviceId]);
      if (!service.rowCount) throw new NotFoundException('Service not found');
    }
    const result = await this.db.query(
      `INSERT INTO safety_reports
       (reporter_id,target_account_id,service_id,category,description)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,reporter_id AS "reporterId",target_account_id AS "targetAccountId",
       service_id AS "serviceId",category,description,status,priority,created_at AS "createdAt"`,
      [user.accountId, dto.targetAccountId ?? null, dto.serviceId ?? null, dto.category, dto.description],
    );
    await this.audit(
      this.db,
      user.accountId,
      'safety.reported',
      'safety_report',
      result.rows[0].id,
      'success',
    );
    return result.rows[0];
  }

  async block(user: AuthPrincipal, targetAccountId: string) {
    if (user.accountId === targetAccountId) {
      throw new ConflictException('Cannot block own account');
    }
    await this.assertAccountExists(targetAccountId);
    await this.db.query(
      'INSERT INTO blocks (blocker_id,blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [user.accountId, targetAccountId],
    );
    await this.audit(this.db, user.accountId, 'account.blocked', 'account', targetAccountId, 'success');
    return { targetAccountId, blocked: true };
  }

  async unblock(user: AuthPrincipal, targetAccountId: string) {
    await this.db.query(
      'DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2',
      [user.accountId, targetAccountId],
    );
    await this.audit(this.db, user.accountId, 'account.unblocked', 'account', targetAccountId, 'success');
    return { targetAccountId, blocked: false };
  }

  async moderationRating(user: AuthPrincipal, ratingId: string, dto: ModerateRatingDto) {
    this.assertModerator(user.role);
    const current = await this.db.query<{
      moderation_state: 'published' | 'flagged' | 'hidden' | 'restored';
    }>(      'SELECT moderation_state FROM ratings WHERE id=$1',
      [ratingId],
    );
    const currentState = current.rows[0]?.moderation_state;
    if (!currentState) throw new NotFoundException('Rating not found');
    const allowed: Record<string, string[]> = {
      published: ['flagged'],
      flagged: ['hidden', 'restored'],
      restored: ['flagged', 'hidden'],
      hidden: ['restored'],
    };
    if (!allowed[currentState]?.includes(dto.moderationState)) {
      throw new ConflictException('Invalid rating moderation transition');
    }
    const result = await this.db.query(
      `UPDATE ratings SET moderation_state=$1,updated_at=NOW()
       WHERE id=$2
       RETURNING id,moderation_state AS "moderationState"`,
      [dto.moderationState, ratingId],
    );
    await this.audit(
      this.db,
      user.accountId,
      'rating.moderated',
      'rating',
      ratingId,
      'success',
      { state: dto.moderationState },
    );
    return result.rows[0];
  }

  async moderationReport(user: AuthPrincipal, reportId: string, dto: ModerateReportDto) {
    this.assertModerator(user.role);
    const result = await this.db.query(
      `UPDATE safety_reports
       SET status=$1,priority=COALESCE($2,priority),updated_at=NOW()
       WHERE id=$3
       RETURNING id,status,priority`,
      [dto.status, dto.priority ?? null, reportId],
    );
    if (!result.rowCount) throw new NotFoundException('Report not found');
    await this.audit(
      this.db,
      user.accountId,
      'safety.report_moderated',
      'safety_report',
      reportId,
      'success',
      { status: dto.status, priority: dto.priority ?? null },
    );
    return result.rows[0];
  }

  async setVerification(user: AuthPrincipal, dto: SetVerificationDto) {
    this.assertModerator(user.role);
    await this.assertAccountExists(dto.accountId);
    const result = await this.db.query(
      `INSERT INTO verification_indicators
       (account_id,verification_type,status,public_label)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (account_id,verification_type)
       DO UPDATE SET status=EXCLUDED.status,public_label=EXCLUDED.public_label,updated_at=NOW()
       RETURNING id,account_id AS "accountId",verification_type AS "verificationType",
       status,public_label AS "publicLabel",updated_at AS "updatedAt"`,
      [dto.accountId, dto.verificationType, dto.status, dto.publicLabel],
    );
    await this.audit(
      this.db,
      user.accountId,
      'verification.updated',
      'verification_indicator',
      result.rows[0].id,
      'success',
      {
        accountId: dto.accountId,
        verificationType: dto.verificationType,
        status: dto.status,
      },
    );
    return result.rows[0];
  }

  async publicVerification(accountId: string) {
    const result = await this.db.query(
      `SELECT verification_type AS "verificationType",public_label AS "publicLabel"
       FROM verification_indicators
       WHERE account_id=$1 AND status='verified'
       ORDER BY verification_type`,
      [accountId],
    );
    return result.rows;
  }

  async assertAccountExists(accountId: string) {
    const result = await this.db.query(
      "SELECT 1 FROM accounts WHERE id=$1 AND status='active'",
      [accountId],
    );
    if (!result.rowCount) throw new NotFoundException('Account not found');
  }

  private assertModerator(role: UserRole) {
    if (role !== 'admin' && role !== 'moderator')
      throw new ForbiddenException('Moderator role required');
  }

  private async audit(
    db: Pool | PoolClient,
    actorId: string,
    eventType: string,
    resourceType: string,
    resourceId: string | null,
    outcome: string,
    metadata: Record<string, unknown> = {},
  ) {
    await db.query(
      `INSERT INTO audit_events
       (actor_id,event_type,resource_type,resource_id,outcome,metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [actorId, eventType, resourceType, resourceId, outcome, metadata],
    );
  }
}
