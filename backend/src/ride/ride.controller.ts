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
import { ChangeRideRouteDto, CreatePassengerRideDto } from './dto';
import { RideService } from './ride.service';

@UseGuards(AuthGuard)
@Controller('rides')
@ApiTags('rides')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Dados inválidos' })
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
export class RideController {
  constructor(@Inject(RideService) private readonly rides: RideService) {}

  @ApiOperation({
    summary: 'Passageiro: cria solicitação de corrida (idempotente)',
  })
  @Post('requests')
  createRequest(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreatePassengerRideDto,
  ) {
    return this.rides
      .createRequest(req.user, dto, key)
      .then((result) => result.body);
  }

  @ApiOperation({ summary: 'Consulta estado atual da corrida' })
  @Get(':rideId')
  get(
    @Req() req: AuthenticatedRequest,
    @Param('rideId', ParseUUIDPipe) rideId: string,
  ) {
    return this.rides.get(req.user, rideId);
  }

  @ApiOperation({ summary: 'Motorista: a caminho da origem' })
  @Post(':rideId/driver-en-route')
  driverEnRoute(
    @Req() req: AuthenticatedRequest,
    @Param('rideId', ParseUUIDPipe) rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'driver_en_route', key);
  }

  @ApiOperation({ summary: 'Motorista: chegou à origem' })
  @Post(':rideId/arrived')
  arrived(
    @Req() req: AuthenticatedRequest,
    @Param('rideId', ParseUUIDPipe) rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'arrived', key);
  }

  @ApiOperation({ summary: 'Motorista: inicia a corrida' })
  @Post(':rideId/start')
  start(
    @Req() req: AuthenticatedRequest,
    @Param('rideId', ParseUUIDPipe) rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'started', key);
  }

  @ApiOperation({ summary: 'Motorista: conclui a corrida' })
  @Post(':rideId/complete')
  complete(
    @Req() req: AuthenticatedRequest,
    @Param('rideId', ParseUUIDPipe) rideId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.rides.transition(req.user, rideId, 'completed', key);
  }

  @ApiOperation({ summary: 'Cancela a corrida com motivo' })
  @Post(':rideId/cancel')
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('rideId', ParseUUIDPipe) rideId: string,
    @Headers('idempotency-key') key: string,
    @Body('reason') reason?: string,
  ) {
    return this.rides.transition(req.user, rideId, 'cancelled', key, reason);
  }

  @ApiOperation({ summary: 'Altera rota com controle de versão' })
  @Post(':rideId/route')
  changeRoute(
    @Req() req: AuthenticatedRequest,
    @Param('rideId', ParseUUIDPipe) rideId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: ChangeRideRouteDto,
  ) {
    return this.rides.changeRoute(req.user, rideId, dto, key);
  }
}
