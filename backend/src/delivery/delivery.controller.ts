import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CreateDeliveryRequestDto, DeliveryTransitionDto } from './dto';
import { DeliveryService } from './delivery.service';

@UseGuards(AuthGuard)
@Controller('deliveries')
export class DeliveryController {
  constructor(
    @Inject(DeliveryService) private readonly deliveries: DeliveryService,
  ) {}
  @Post('requests')
  createRequest(
    @Req() r: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() d: CreateDeliveryRequestDto,
  ) {
    return this.deliveries.createRequest(r.user, d, key).then((x) => x.body);
  }
  @Get(':deliveryId')
  get(@Req() r: AuthenticatedRequest, @Param('deliveryId') id: string) {
    return this.deliveries.get(r.user, id);
  }
  @HttpCode(200)
  @Post(':deliveryId/provider-en-route')
  providerEnRoute(
    @Req() r: AuthenticatedRequest,
    @Param('deliveryId') id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: DeliveryTransitionDto,
  ) {
    return this.deliveries
      .transition(r.user, id, 'provider_en_route', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':deliveryId/at-pickup')
  atPickup(
    @Req() r: AuthenticatedRequest,
    @Param('deliveryId') id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: DeliveryTransitionDto,
  ) {
    return this.deliveries
      .transition(r.user, id, 'at_pickup', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':deliveryId/picked-up')
  pickedUp(
    @Req() r: AuthenticatedRequest,
    @Param('deliveryId') id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: DeliveryTransitionDto,
  ) {
    return this.deliveries
      .transition(r.user, id, 'picked_up', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':deliveryId/in-transit')
  inTransit(
    @Req() r: AuthenticatedRequest,
    @Param('deliveryId') id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: DeliveryTransitionDto,
  ) {
    return this.deliveries
      .transition(r.user, id, 'in_transit', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':deliveryId/delivered')
  delivered(
    @Req() r: AuthenticatedRequest,
    @Param('deliveryId') id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: DeliveryTransitionDto,
  ) {
    return this.deliveries
      .transition(r.user, id, 'delivered', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':deliveryId/cancel')
  cancel(
    @Req() r: AuthenticatedRequest,
    @Param('deliveryId') id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: DeliveryTransitionDto,
  ) {
    return this.deliveries
      .transition(r.user, id, 'cancelled', key, d)
      .then((x) => x.body);
  }
}
