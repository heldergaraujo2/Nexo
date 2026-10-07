import {
  Body,
  Inject,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import {
  CancelDto,
  CreateOfferDto,
  CreateServiceRequestDto,
  MarketplaceAvailabilityDto,
} from './dto';
import { MarketplaceService } from './marketplace.service';

@UseGuards(AuthGuard)
@Controller()
export class MarketplaceController {
  constructor(@Inject(MarketplaceService) private readonly marketplace: MarketplaceService) {}

  @Put('me/marketplace')
  setAvailability(
    @Req() req: AuthenticatedRequest,
    @Body() dto: MarketplaceAvailabilityDto,
  ) {
    return this.marketplace.setAvailability(req.user, dto);
  }

  @Post('requests')
  createRequest(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.marketplace.createRequest(req.user, dto, key);
  }

  @Get('requests/:requestId')
  getRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.marketplace.getRequest(req.user, requestId);
  }

  @Get('requests/:requestId/matches')
  matches(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.marketplace.matches(req.user, requestId);
  }

  @Post('requests/:requestId/offers')
  createOffer(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.marketplace.createOffer(req.user, requestId, dto, key);
  }

  @Post('requests/:requestId/accept')
  acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace.acceptRequest(req.user, requestId, key);
  }

  @Post('requests/:requestId/cancel')
  cancelRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CancelDto,
  ) {
    return this.marketplace.cancelRequest(req.user, requestId, key, dto);
  }

  @Get('requests/:requestId/offers')
  listOffers(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.marketplace.listOffers(req.user, requestId);
  }

  @Post('offers/:offerId/reject')
  rejectOffer(
    @Req() req: AuthenticatedRequest,
    @Param('offerId') offerId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace.rejectOffer(req.user, offerId, key);
  }

  @Post('offers/:offerId/withdraw')
  withdrawOffer(
    @Req() req: AuthenticatedRequest,
    @Param('offerId') offerId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace.withdrawOffer(req.user, offerId, key);
  }

  @Post('offers/:offerId/accept')
  acceptOffer(
    @Req() req: AuthenticatedRequest,
    @Param('offerId') offerId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace.acceptOffer(req.user, offerId, key);
  }

  @Get('services/:serviceId')
  getService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
  ) {
    return this.marketplace.getService(req.user, serviceId);
  }

  @Post('services/:serviceId/start')
  startService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace.transitionService(req.user, serviceId, 'start', key);
  }

  @Post('services/:serviceId/complete')
  completeService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace.transitionService(req.user, serviceId, 'complete', key);
  }

  @Post('services/:serviceId/cancel')
  cancelService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CancelDto,
  ) {
    return this.marketplace.transitionService(req.user, serviceId, 'cancel', key, dto);
  }

  @Get('me/services/history')
  history(@Req() req: AuthenticatedRequest) {
    return this.marketplace.history(req.user);
  }

  @Get('me/notifications')
  notifications(@Req() req: AuthenticatedRequest) {
    return this.marketplace.notifications(req.user);
  }
}
