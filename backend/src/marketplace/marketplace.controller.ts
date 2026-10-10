import {
  Body,
  Inject,
  Controller,
  Get,
  HttpCode,
  Headers,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
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
  CancelDto,
  CreateOfferDto,
  CreateServiceRequestDto,
  MarketplaceAvailabilityDto,
} from './dto';
import { MarketplaceService } from './marketplace.service';

@UseGuards(AuthGuard)
@Controller()
@ApiTags('marketplace')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Dados inválidos' })
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
export class MarketplaceController {
  constructor(
    @Inject(MarketplaceService)
    private readonly marketplace: MarketplaceService,
  ) {}

  @ApiOperation({ summary: 'Provider: lista solicitações abertas compatíveis' })
  @Get('me/marketplace/open-requests')
  openRequests(@Req() req: AuthenticatedRequest) {
    return this.marketplace.openRequests(req.user);
  }

  @ApiOperation({ summary: 'Provider: atualiza disponibilidade e categorias' })
  @Put('me/marketplace')
  setAvailability(
    @Req() req: AuthenticatedRequest,
    @Body() dto: MarketplaceAvailabilityDto,
  ) {
    return this.marketplace.setAvailability(req.user, dto);
  }

  @HttpCode(201)
  @ApiOperation({
    summary: 'Customer: cria solicitação de serviço (idempotente)',
  })
  @Post('requests')
  createRequest(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.marketplace
      .createRequest(req.user, dto, key)
      .then((result) => result.body);
  }

  @ApiOperation({ summary: 'Consulta solicitação de serviço' })
  @Get('requests/:requestId')
  getRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.marketplace.getRequest(req.user, requestId);
  }

  @ApiOperation({ summary: 'Customer: providers elegíveis para a solicitação' })
  @Get('requests/:requestId/matches')
  matches(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.marketplace.matches(req.user, requestId);
  }

  @HttpCode(201)
  @ApiOperation({ summary: 'Provider: envia oferta com preço' })
  @Post('requests/:requestId/offers')
  createOffer(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.marketplace
      .createOffer(req.user, requestId, dto, key)
      .then((result) => result.body);
  }

  @HttpCode(201)
  @ApiOperation({ summary: 'Provider: aceite direto (idempotente, atômico)' })
  @Post('requests/:requestId/accept')
  acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace
      .acceptRequest(req.user, requestId, key)
      .then((result) => result.body);
  }

  @HttpCode(200)
  @ApiOperation({ summary: 'Customer: cancela solicitação' })
  @Post('requests/:requestId/cancel')
  cancelRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CancelDto,
  ) {
    return this.marketplace
      .cancelRequest(req.user, requestId, key, dto)
      .then((result) => result.body);
  }

  @ApiOperation({ summary: 'Customer: lista ofertas recebidas' })
  @Get('requests/:requestId/offers')
  listOffers(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.marketplace.listOffers(req.user, requestId);
  }

  @HttpCode(200)
  @ApiOperation({ summary: 'Customer: rejeita oferta' })
  @Post('offers/:offerId/reject')
  rejectOffer(
    @Req() req: AuthenticatedRequest,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace
      .rejectOffer(req.user, offerId, key)
      .then((result) => result.body);
  }

  @HttpCode(200)
  @ApiOperation({ summary: 'Provider: retira oferta' })
  @Post('offers/:offerId/withdraw')
  withdrawOffer(
    @Req() req: AuthenticatedRequest,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace
      .withdrawOffer(req.user, offerId, key)
      .then((result) => result.body);
  }

  @HttpCode(201)
  @ApiOperation({ summary: 'Customer: aceita oferta com preço' })
  @Post('offers/:offerId/accept')
  acceptOffer(
    @Req() req: AuthenticatedRequest,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace
      .acceptOffer(req.user, offerId, key)
      .then((result) => result.body);
  }

  @ApiOperation({ summary: 'Consulta serviço' })
  @Get('services/:serviceId')
  getService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.marketplace.getService(req.user, serviceId);
  }

  @HttpCode(200)
  @ApiOperation({ summary: 'Provider: inicia serviço aceito' })
  @Post('services/:serviceId/start')
  startService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace
      .transitionService(req.user, serviceId, 'start', key)
      .then((result) => result.body);
  }

  @HttpCode(200)
  @ApiOperation({ summary: 'Provider: conclui serviço' })
  @Post('services/:serviceId/complete')
  completeService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Headers('idempotency-key') key: string,
  ) {
    return this.marketplace
      .transitionService(req.user, serviceId, 'complete', key)
      .then((result) => result.body);
  }

  @HttpCode(200)
  @ApiOperation({ summary: 'Cancela serviço' })
  @Post('services/:serviceId/cancel')
  cancelService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CancelDto,
  ) {
    return this.marketplace
      .transitionService(req.user, serviceId, 'cancel', key, dto)
      .then((result) => result.body);
  }

  @ApiOperation({ summary: 'Histórico de serviços do usuário' })
  @Get('me/services/history')
  history(@Req() req: AuthenticatedRequest) {
    return this.marketplace.history(req.user);
  }

  @ApiOperation({ summary: 'Notificações do usuário (limite 100)' })
  @Get('me/notifications')
  notifications(@Req() req: AuthenticatedRequest) {
    return this.marketplace.notifications(req.user);
  }
}
