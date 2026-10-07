import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import { RegisterMediaDto } from './dto';

@Injectable()
export class MediaService {
  constructor(private readonly db: Pool) {}

  async register(user: AuthPrincipal, dto: RegisterMediaDto) {
    const result = await this.db.query(
      `INSERT INTO media_assets
       (owner_id,media_type,object_key,mime_type,byte_size,checksum_sha256,caption,visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,"media_type" AS "mediaType",object_key AS "objectKey",mime_type AS "mimeType",
       byte_size AS "byteSize",checksum_sha256 AS "checksumSha256",caption,visibility,moderation_state AS "moderationState",created_at AS "createdAt"`,
      [user.accountId,dto.mediaType,dto.objectKey,dto.mimeType,dto.byteSize,dto.checksumSha256,dto.caption ?? null,dto.visibility ?? 'public'],
    );
    return result.rows[0];
  }

  async mine(user: AuthPrincipal) {
    const result = await this.db.query(
      `SELECT id,media_type AS "mediaType",object_key AS "objectKey",mime_type AS "mimeType",
       byte_size AS "byteSize",checksum_sha256 AS "checksumSha256",caption,visibility,
       moderation_state AS "moderationState",created_at AS "createdAt"
       FROM media_assets WHERE owner_id=$1 ORDER BY created_at DESC`, [user.accountId],
    );
    return result.rows;
  }

  async public(accountId: string) {
    const result = await this.db.query(
      `SELECT id,media_type AS "mediaType",object_key AS "objectKey",caption,created_at AS "createdAt"
       FROM media_assets WHERE owner_id=$1 AND visibility='public' AND moderation_state='approved'
       ORDER BY created_at DESC`, [accountId],
    );
    return result.rows;
  }
}
