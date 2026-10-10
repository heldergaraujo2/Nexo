import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RecoveryRequestDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';

@Controller('auth')
@ApiTags('auth')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Dados inválidos' })
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
export class AuthController {
  private readonly auth: AuthService;

  constructor(@Inject(AuthService) auth: AuthService) {
    this.auth = auth;
  }

  @ApiOperation({
    summary: 'Cria conta (customer ou provider) e retorna access token',
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @ApiOperation({ summary: 'Autentica e retorna access token' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @ApiOperation({ summary: 'Solicita recuperação de senha' })
  @Post('password-recovery')
  recover(@Body() dto: RecoveryRequestDto) {
    return this.auth.requestRecovery(dto);
  }
  @ApiOperation({ summary: 'Redefine senha com token de recuperação' })
  @Post('password-reset')
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }
}
