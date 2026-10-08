import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import {
  CancelSubscriptionDto,
  CreateSubscriptionDto,
  SetSubscriptionStatusDto,
} from './dto';
import { SubscriptionService } from './subscription.service';
@UseGuards(AuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    @Inject(SubscriptionService)
    private readonly subscriptions: SubscriptionService,
  ) {}
  @Post() create(
    @Req() r: AuthenticatedRequest,
    @Body() d: CreateSubscriptionDto,
    @Headers('idempotency-key') k: string,
  ) {
    return this.subscriptions.create(r.user, d, k);
  }
  @Get('me') get(@Req() r: AuthenticatedRequest) {
    return this.subscriptions.get(r.user);
  }
  @HttpCode(200) @Post(':id/renew') renew(
    @Req() r: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') k: string,
  ) {
    return this.subscriptions.renew(r.user, id, k);
  }
  @HttpCode(200) @Post(':id/cancel') cancel(
    @Req() r: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() d: CancelSubscriptionDto,
    @Headers('idempotency-key') k: string,
  ) {
    return this.subscriptions.cancel(r.user, id, d, k);
  }
  @Put(':id/status') setStatus(
    @Req() r: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() d: SetSubscriptionStatusDto,
    @Headers('idempotency-key') k: string,
  ) {
    return this.subscriptions.setStatus(r.user, id, d, k);
  }
  @Get(':id/history') history(
    @Req() r: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.subscriptions.history(r.user, id);
  }
}
