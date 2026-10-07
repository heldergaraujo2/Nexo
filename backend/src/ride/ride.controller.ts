import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
  Get,
  Inject,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ChangeRideRouteDto, CreatePassengerRideDto } from './dto';
import { RideService } from './ride.service';

@UseGuards(AuthGuard)
@Controller('rides')
export class RideController {
  constructor(@Inject(RideService) private readonly rides: RideService) {}

  @Post('requests')
  createRequest(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreatePassengerRideDto,
  ) {
    return this.rides.createRequest(req.user, dto, key).then((result) => result.body);
  }

  @Get(':rideId')
  get(@Req() req: AuthenticatedRequest, @Param('rideId') rideId: string) {
    return this.rides.get(req.user, rideId);
  }

  @Post(':rideId/driver-en-route')
  driverEnRoute(
    @Req() req: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'driver_en_route', key);
  }

  @Post(':rideId/arrived')
  arrived(
    @Req() req: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'arrived', key);
  }

  @Post(':rideId/start')
  start(
    @Req() req: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'started', key);
  }

  @Post(':rideId/complete')
  complete(
    @Req() req: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'completed', key);
  }

  @Post(':rideId/cancel')
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Headers('idempotency-key') key: string,
    @Body('reason') reason?: string,
  ) {
    return this.rides.transition(req.user, rideId, 'cancelled', key, reason);
  }

  @Post(':rideId/route')
  changeRoute(
    @Req() req: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: ChangeRideRouteDto,
  ) {
    return this.rides.changeRoute(req.user, rideId, dto, key);
  }
}
