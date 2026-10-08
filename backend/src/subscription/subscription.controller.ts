import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CancelSubscriptionDto, CreateSubscriptionDto, SetSubscriptionStatusDto } from './dto';
import { SubscriptionService } from './subscription.service';

@UseGuards(AuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
  constructor(@Inject(SubscriptionService) private readonly subscriptions: SubscriptionService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateSubscriptionDto, @Headers('idempotency-key') key: string) {
    return this.subscriptions.create(req.user, dto, key);
  }

  @Get('me')
  get(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.get(req.user);
  }

  @HttpCode(200)
  @Post(':subscriptionId/renew')
  renew(@Req() req: AuthenticatedRequest, @Param('subscriptionId') id: string, @Headers('idempotency-key') key: string) {
    return this.subscriptions.renew(req.user, id, key);
  }

  @HttpCode(200)
  @Post(':subscriptionId/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('subscriptionId') id: string, @Body() dto: CancelSubscriptionDto, @Headers('idempotency-key') key: string) {
    return this.subscriptions.cancel(req.user, id, dto, key);
  }

  @Put(':subscriptionId/status')
  setStatus(@Req() req: AuthenticatedRequest, @Param('subscriptionId') id: string, @Body() dto: SetSubscriptionStatusDto, @Headers('idempotency-key') key: string) {
    return this.subscriptions.setStatus(req.user, id, dto, key);
  }

  @Get(':subscriptionId/history')
  history(@Req() req: AuthenticatedRequest, @Param('subscriptionId') id: string) {
    return this.subscriptions.history(req.user, id);
  }
}
