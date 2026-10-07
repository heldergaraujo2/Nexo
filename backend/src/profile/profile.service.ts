import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { AuthPrincipal, PublicProfile } from '../auth/auth.types';
import { UpdateProfileDto } from '../auth/dto';

@Injectable()
export class ProfileService {
  constructor(@Inject(Pool) private readonly db: Pool) {}

  async me(user: AuthPrincipal) {
    const result = await this.db.query<PublicProfile & { email: string }>(
      `SELECT p.id,p.account_id AS "accountId",p.display_name AS "displayName",p.photo_url AS "photoUrl",
       p.bio,p.professional_info AS "professionalInfo",(a.role='provider') AS "isProvider",
       p.created_at AS "createdAt",a.email
       FROM profiles p JOIN accounts a ON a.id=p.account_id WHERE p.account_id=$1`,
      [user.accountId],
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
       WHERE p.account_id=$1 AND a.status='active'`,
      [accountId],
    );
    if (!result.rowCount) throw new NotFoundException('Profile not found');
    return result.rows[0];
  }

  async update(user: AuthPrincipal, dto: UpdateProfileDto) {
    if (
      dto.displayName === undefined &&
      dto.bio === undefined &&
      dto.professionalInfo === undefined &&
      dto.photoUrl === undefined
    ) {
      return this.me(user);
    }

    const values: unknown[] = [user.accountId];
    const updates: string[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      updates.push(column + '=$' + values.length);
    };

    if (dto.displayName !== undefined)
      add('display_name', dto.displayName.trim());
    if (dto.bio !== undefined) add('bio', dto.bio);
    if (dto.professionalInfo !== undefined)
      add('professional_info', dto.professionalInfo);
    if (dto.photoUrl !== undefined) add('photo_url', dto.photoUrl);

    const result = await this.db.query<PublicProfile>(
      `UPDATE profiles SET ${updates.join(',')},updated_at=NOW()
       WHERE account_id=$1
       RETURNING id,account_id AS "accountId",display_name AS "displayName",photo_url AS "photoUrl",
       bio,professional_info AS "professionalInfo",created_at AS "createdAt"`,
      values,
    );
    if (!result.rowCount) throw new NotFoundException('Profile not found');
    return result.rows[0];
  }

  assertProvider(user: AuthPrincipal) {
    if (user.role !== 'provider')
      throw new ForbiddenException('Provider role required');
  }
}
