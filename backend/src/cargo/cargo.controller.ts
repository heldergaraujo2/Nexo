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
import {
  CargoProposalDto,
  CargoTransitionDto,
  CreateCargoRequestDto,
} from './dto';
import { CargoService } from './cargo.service';

@UseGuards(AuthGuard)
@Controller('cargo')
export class CargoController {
  constructor(@Inject(CargoService) private readonly cargo: CargoService) {}

  @Post('requests')
  createRequest(
    @Req() r: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() d: CreateCargoRequestDto,
  ) {
    return this.cargo.createRequest(r.user, d, key).then((x) => x.body);
  }
  @Get('requests/:requestId')
  getRequest(
    @Req() r: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) id: string,
  ) {
    return this.cargo.getRequest(r.user, id);
  }
  @Get('requests/:requestId/proposals')
  proposals(
    @Req() r: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) id: string,
  ) {
    return this.cargo.proposals(r.user, id);
  }
  @HttpCode(201)
  @Post('requests/:requestId/proposals')
  createProposal(
    @Req() r: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoProposalDto,
  ) {
    return this.cargo.createProposal(r.user, id, d, key).then((x) => x.body);
  }
  @HttpCode(200)
  @Post('proposals/:proposalId/counter')
  counter(
    @Req() r: AuthenticatedRequest,
    @Param('proposalId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoProposalDto,
  ) {
    return this.cargo.counter(r.user, id, d, key).then((x) => x.body);
  }
  @HttpCode(201)
  @Post('proposals/:proposalId/accept')
  accept(
    @Req() r: AuthenticatedRequest,
    @Param('proposalId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.cargo.accept(r.user, id, key).then((x) => x.body);
  }
  @Get(':cargoId')
  get(
    @Req() r: AuthenticatedRequest,
    @Param('cargoId', ParseUUIDPipe) id: string,
  ) {
    return this.cargo.get(r.user, id);
  }
  @HttpCode(200)
  @Post(':cargoId/provider-en-route')
  providerEnRoute(
    @Req() r: AuthenticatedRequest,
    @Param('cargoId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoTransitionDto,
  ) {
    return this.cargo
      .transition(r.user, id, 'provider_en_route', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':cargoId/at-pickup')
  atPickup(
    @Req() r: AuthenticatedRequest,
    @Param('cargoId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoTransitionDto,
  ) {
    return this.cargo
      .transition(r.user, id, 'at_pickup', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':cargoId/picked-up')
  pickedUp(
    @Req() r: AuthenticatedRequest,
    @Param('cargoId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoTransitionDto,
  ) {
    return this.cargo
      .transition(r.user, id, 'picked_up', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':cargoId/in-transit')
  inTransit(
    @Req() r: AuthenticatedRequest,
    @Param('cargoId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoTransitionDto,
  ) {
    return this.cargo
      .transition(r.user, id, 'in_transit', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':cargoId/delivered')
  delivered(
    @Req() r: AuthenticatedRequest,
    @Param('cargoId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoTransitionDto,
  ) {
    return this.cargo
      .transition(r.user, id, 'delivered', key, d)
      .then((x) => x.body);
  }
  @HttpCode(200)
  @Post(':cargoId/cancel')
  cancel(
    @Req() r: AuthenticatedRequest,
    @Param('cargoId', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Body() d: CargoTransitionDto,
  ) {
    return this.cargo
      .transition(r.user, id, 'cancelled', key, d)
      .then((x) => x.body);
  }
}
