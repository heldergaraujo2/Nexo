import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthPrincipal } from './auth.types';
import { TokenService } from './token.service';

export interface AuthenticatedRequest extends Request { user: AuthPrincipal; }

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TokenService) private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required');
    request.user = this.tokens.verify(header.slice(7));
    return true;
  }
}
