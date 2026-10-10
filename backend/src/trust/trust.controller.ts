import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateFavoriteDto,
  CreateRatingDto,
  CreateReportDto,
  ModerateRatingDto,
  ModerateReportDto,
  SetVerificationDto,
} from './dto';
import { TrustService } from './trust.service';

@Controller()
@ApiTags('reputação e segurança')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Dados inválidos' })
@ApiUnauthorizedResponse({ description: 'Não autenticado' })
export class TrustController {
  private readonly trust: TrustService;

  constructor(@Inject(TrustService) trust: TrustService) {
    this.trust = trust;
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Avalia serviço concluído (par customer↔provider)' })
  @Post('ratings')
  rate(@Req() req: AuthenticatedRequest, @Body() dto: CreateRatingDto) {
    return this.trust.rate(req.user, dto);
  }

  @ApiOperation({ summary: 'Reputação pública (média, total, avaliações)' })
  @Get('profiles/:accountId/ratings')
  ratings(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.trust.ratings(accountId);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Adiciona favorito' })
  @Post('favorites')
  favorite(@Req() req: AuthenticatedRequest, @Body() dto: CreateFavoriteDto) {
    return this.trust.favorite(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Remove favorito' })
  @Delete('favorites/:accountId')
  unfavorite(
    @Req() req: AuthenticatedRequest,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.trust.unfavorite(req.user, accountId);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Lista favoritos' })
  @Get('me/favorites')
  favorites(@Req() req: AuthenticatedRequest) {
    return this.trust.favorites(req.user);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Registra relato de segurança' })
  @Post('safety/reports')
  report(@Req() req: AuthenticatedRequest, @Body() dto: CreateReportDto) {
    return this.trust.report(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Bloqueia conta' })
  @Post('safety/blocks/:accountId')
  block(
    @Req() req: AuthenticatedRequest,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.trust.block(req.user, accountId);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Desbloqueia conta' })
  @Delete('safety/blocks/:accountId')
  unblock(
    @Req() req: AuthenticatedRequest,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.trust.unblock(req.user, accountId);
  }

  @ApiOperation({ summary: 'Verificação pública de perfil' })
  @Get('profiles/:accountId/verification')
  verification(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.trust.publicVerification(accountId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Admin: modera avaliação' })
  @Put('admin/ratings/:ratingId/moderation')
  moderateRating(
    @Req() req: AuthenticatedRequest,
    @Param('ratingId', ParseUUIDPipe) ratingId: string,
    @Body() dto: ModerateRatingDto,
  ) {
    return this.trust.moderationRating(req.user, ratingId, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Admin: atualiza relato de segurança' })
  @Put('admin/reports/:reportId')
  moderateReport(
    @Req() req: AuthenticatedRequest,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ModerateReportDto,
  ) {
    return this.trust.moderationReport(req.user, reportId, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Admin: registra verificação' })
  @Post('admin/verifications')
  setVerification(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetVerificationDto,
  ) {
    return this.trust.setVerification(req.user, dto);
  }
}
