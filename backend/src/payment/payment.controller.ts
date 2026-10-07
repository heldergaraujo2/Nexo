import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards, Inject, HttpCode } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ConfirmPaymentDto, CreatePaymentRecordDto, DisputePaymentDto } from './dto';
import { PaymentService } from './payment.service';

@UseGuards(AuthGuard)
@Controller('payment-records')
export class PaymentController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  @Post('services/:serviceId')
  @HttpCode(201)
  create(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreatePaymentRecordDto,
  ) {
    return this.payments.create(req.user, serviceId, dto, key).then((result) => result.body);
  }

  @Get('services/:serviceId')
  listForService(@Req() req: AuthenticatedRequest, @Param('serviceId') serviceId: string) {
    return this.payments.listForService(req.user, serviceId);
  }

  @Get(':paymentId')
  get(@Req() req: AuthenticatedRequest, @Param('paymentId') paymentId: string) {
    return this.payments.get(req.user, paymentId);
  }

  @Post(':paymentId/confirm')
  @HttpCode(200)
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('paymentId') paymentId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.payments.confirm(req.user, paymentId, dto, key).then((result) => result.body);
  }

  @Post(':paymentId/dispute')
  @HttpCode(200)
  dispute(
    @Req() req: AuthenticatedRequest,
    @Param('paymentId') paymentId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: DisputePaymentDto,
  ) {
    return this.payments.dispute(req.user, paymentId, dto, key).then((result) => result.body);
  }
}
