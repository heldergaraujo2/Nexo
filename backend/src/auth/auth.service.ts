import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { LoginDto, RecoveryRequestDto, RegisterDto, ResetPasswordDto } from './dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: Pool,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.db.query('SELECT 1 FROM accounts WHERE email = $1', [email]);
    if (exists.rowCount) throw new ConflictException('Account already exists');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const role = dto.role ?? 'customer';
      const account = await client.query<{id:string;role:string}>(
        'INSERT INTO accounts (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, role',
        [email, await this.passwords.hash(dto.password), role],
      );
      const created = account.rows[0];
      if (!created) throw new ConflictException('Account creation failed');
      const id = created.id;
      await client.query('INSERT INTO profiles (account_id, display_name) VALUES ($1,$2)', [id, dto.displayName.trim()]);
      await client.query('COMMIT');
      return { accessToken: this.tokens.sign({ accountId: id, role: role as never }), accountId: id, role };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async login(dto: LoginDto) {
    const result = await this.db.query<{id:string;password_hash:string;role:string;status:string}>(
      'SELECT id,password_hash,role,status FROM accounts WHERE email=$1', [dto.email.trim().toLowerCase()],
    );
    const account = result.rows[0];
    if (!account || account.status !== 'active' || !(await this.passwords.verify(dto.password, account.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { accessToken: this.tokens.sign({ accountId: account.id, role: account.role as never }), accountId: account.id, role: account.role };
  }

  async requestRecovery(dto: RecoveryRequestDto) {
    const email = dto.email.trim().toLowerCase();
    const result = await this.db.query<{id:string}>('SELECT id FROM accounts WHERE email=$1 AND status=$2', [email,'active']);
    const response: {message:string; developmentToken?:string} = { message: 'If the account exists, recovery instructions will be sent.' };
    if (!result.rowCount || !result.rows[0]) return response;
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    await this.db.query(
      'INSERT INTO password_resets (account_id, token_hash, expires_at) VALUES ($1,$2,NOW()+INTERVAL \'30 minutes\')',
      [result.rows[0].id, hash],
    );
    if (process.env.NODE_ENV !== 'production') response.developmentToken = raw;
    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hash = createHash('sha256').update(dto.token).digest('hex');
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query<{id:string}>(
        'SELECT id FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE', [hash],
      );
      const reset = found.rows[0];
      if (!found.rowCount || !reset) throw new UnauthorizedException('Invalid or expired recovery token');
      await client.query('UPDATE accounts SET password_hash=$1, updated_at=NOW() WHERE id=$2', [await this.passwords.hash(dto.newPassword), reset.id]);
      await client.query('UPDATE password_resets SET used_at=NOW() WHERE token_hash=$1', [hash]);
      await client.query('COMMIT');
      return { message: 'Password updated' };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
