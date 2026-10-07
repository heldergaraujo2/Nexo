import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RecoveryRequestDto, RegisterDto, ResetPasswordDto } from './dto';

@Controller('auth')
export class AuthController {
  private readonly auth: AuthService;

  constructor(auth: AuthService) {
    this.auth = auth;
  }

  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Post('password-recovery') recover(@Body() dto: RecoveryRequestDto) { return this.auth.requestRecovery(dto); }
  @Post('password-reset') reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }
}
