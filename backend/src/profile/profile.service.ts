import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthPrincipal, PublicProfile } from '../auth/auth.types';
import { UpdateProfileDto } from '../auth/dto';

@Injectable()
export class ProfileService {
  constructor(private readonly db: Pool) {}

  async me(user: AuthPrincipal) {
    const result = await this.db.query<PublicProfile & {email:string}>(
      `SELECT p.id,p.account_id AS "accountId",p.display_name AS "displayName",p.photo_url AS "photoUrl",
       p.bio,p.professional_info AS "professionalInfo",(a.role='provider') AS "isProvider",
       p.created_at AS "createdAt",a.email
       FROM profiles p JOIN accounts a ON a.id=p.account_id WHERE p.account_id=$1`, [user.accountId],
    );
    if (!result.rowCount) throw new NotFoundException('Profile not found');
    return { ...result.rows[0] };
  }

  async public(accountId: string) {
    const result = await this.db.query<PublicProfile>(
      `SELECT p.id,p.account_id AS "accountId",p.display_name AS "displayName",p.photo_url AS "photoUrl",
       p.bio,p.professional_info AS "professionalInfo",(a.role='provider') AS "isProvider",
       p.created_at AS "createdAt"
       FROM profiles p JOIN accounts a ON a.id=p.account_id
       WHERE p.account_id=$1 AND a.status='active'`, [accountId],
    );
    if (!result.rowCount) throw new NotFoundException('Profile not found');
    return result.rows[0];
  }

  async update(user: AuthPrincipal, dto: UpdateProfileDto) {
    if (dto.displayName === undefined && dto.bio === undefined && dto.professionalInfo === undefined && dto.photoUrl === undefined) {
      return this.me(user);
    }
    const result = await this.db.query<PublicProfile>(
      `UPDATE profiles SET display_name=COALESCE($2,display_name),bio=COALESCE($3,bio),
       professional_info=COALESCE($4,professional_info),photo_url=$5,updated_at=NOW()
       WHERE account_id=$1
       RETURNING id,account_id AS "accountId",display_name AS "displayName",photo_url AS "photoUrl",
       bio,professional_info AS "professionalInfo",created_at AS "createdAt"`,
      [user.accountId,dto.displayName?.trim(),dto.bio,dto.professionalInfo,dto.photoUrl],
    );
    if (!result.rowCount) throw new NotFoundException('Profile not found');
    return result.rows[0];
  }

  assertProvider(user: AuthPrincipal) {
    if (user.role !== 'provider') throw new ForbiddenException('Provider role required');
  }
}
