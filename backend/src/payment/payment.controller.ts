import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
  Inject,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import {
  ConfirmPaymentDto,
  CreatePaymentRecordDto,
  DisputePaymentDto,
} from './dto';
import { PaymentService } from './payment.service';

@UseGuards(AuthGuard)
@Controller('payment-records')
@ApiTags('pagamentos')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Dados inválidos' })
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  @ApiOperation({
    summary: 'Customer: registra pagamento (1 ativo por serviço)',
  })
  @Post('services/:serviceId')
  @HttpCode(201)
  create(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreatePaymentRecordDto,
  ) {
    return this.payments
      .create(req.user, serviceId, dto, key)
      .then((result) => result.body);
  }

  @ApiOperation({ summary: 'Lista registros de pagamento do serviço' })
  @Get('services/:serviceId')
  listForService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.payments.listForService(req.user, serviceId);
  }

  @ApiOperation({ summary: 'Consulta registro de pagamento' })
  @Get(':paymentId')
  get(
    @Req() req: AuthenticatedRequest,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.payments.get(req.user, paymentId);
  }

  @ApiOperation({
    summary: 'Provider: confirma com o valor esperado (idempotente)',
  })
  @Post(':paymentId/confirm')
  @HttpCode(200)
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.payments
      .confirm(req.user, paymentId, dto, key)
      .then((result) => result.body);
  }

  @ApiOperation({ summary: 'Abre disputa de pagamento' })
  @Post(':paymentId/dispute')
  @HttpCode(200)
  dispute(
    @Req() req: AuthenticatedRequest,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: DisputePaymentDto,
  ) {
    return this.payments
      .dispute(req.user, paymentId, dto, key)
      .then((result) => result.body);
  }
}
