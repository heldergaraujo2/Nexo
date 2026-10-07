import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { AuthPrincipal, UserRole } from './auth.types';

@Injectable()
export class TokenService {
  private readonly secret = process.env.AUTH_TOKEN_SECRET ?? '';

  constructor() {
    if (this.secret.length < 32) {
      throw new Error('AUTH_TOKEN_SECRET must contain at least 32 characters');
    }
  }

  sign(principal: AuthPrincipal, expiresInSeconds = 900): string {
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      sub: principal.accountId,
      role: principal.role,
      jti: randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
    const body = `${header}.${payload}`;
    return `${body}.${this.signature(body)}`;
  }

  verify(token: string): AuthPrincipal {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new UnauthorizedException('Invalid access token');
    }
    const body = `${parts[0]}.${parts[1]}`;
    if (this.signature(body) !== parts[2])
      throw new UnauthorizedException('Invalid access token');
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as {
      sub?: string;
      role?: UserRole;
      exp?: number;
    };
    if (
      !payload.sub ||
      !payload.role ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }
    return { accountId: payload.sub, role: payload.role };
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}
