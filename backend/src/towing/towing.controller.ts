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
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CreateTowingRequestDto, TowingTransitionDto } from './dto';
import { TowingService } from './towing.service';

@UseGuards(AuthGuard)
@Controller('towing')
export class TowingController {
  constructor(@Inject(TowingService) private readonly towing: TowingService) {}

  @Post('requests')
  createRequest(
    @Req() r: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() d: CreateTowingRequestDto,
  ) {
    return this.towing.createRequest(r.user, d, key).then((x) => x.body);
  }

  @Get('requests/:requestId')
  getRequest(
    @Req() r: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) id: string,
  ) {
    return this.towing.getRequest(r.user, id);
  }

  @Get(':towingId')
  get(
    @Req() r: AuthenticatedRequest,
    @Param('towingId', ParseUUIDPipe) id: string,
  ) {
    return this.towing.get(r.user, id);
  }

  @HttpCode(200)
  @Post(':towingId/provider-en-route')
  providerEnRoute(
    @Req() r: AuthenticatedRequest,
    @Param('towingId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: TowingTransitionDto,
  ) {
    return this.towing
      .transition(r.user, id, 'provider_en_route', key, d)
      .then((x) => x.body);
  }

  @HttpCode(200)
  @Post(':towingId/arrived')
  arrived(
    @Req() r: AuthenticatedRequest,
    @Param('towingId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: TowingTransitionDto,
  ) {
    return this.towing
      .transition(r.user, id, 'arrived', key, d)
      .then((x) => x.body);
  }

  @HttpCode(200)
  @Post(':towingId/loading')
  loading(
    @Req() r: AuthenticatedRequest,
    @Param('towingId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: TowingTransitionDto,
  ) {
    return this.towing
      .transition(r.user, id, 'loading', key, d)
      .then((x) => x.body);
  }

  @HttpCode(200)
  @Post(':towingId/in-tow')
  inTow(
    @Req() r: AuthenticatedRequest,
    @Param('towingId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: TowingTransitionDto,
  ) {
    return this.towing
      .transition(r.user, id, 'in_tow', key, d)
      .then((x) => x.body);
  }

  @HttpCode(200)
  @Post(':towingId/completed')
  completed(
    @Req() r: AuthenticatedRequest,
    @Param('towingId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: TowingTransitionDto,
  ) {
    return this.towing
      .transition(r.user, id, 'completed', key, d)
      .then((x) => x.body);
  }

  @HttpCode(200)
  @Post(':towingId/cancel')
  cancel(
    @Req() r: AuthenticatedRequest,
    @Param('towingId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: TowingTransitionDto,
  ) {
    return this.towing
      .transition(r.user, id, 'cancelled', key, d)
      .then((x) => x.body);
  }
}
