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
export class TrustController {
  private readonly trust: TrustService;

  constructor(@Inject(TrustService) trust: TrustService) {
    this.trust = trust;
  }

  @UseGuards(AuthGuard)
  @Post('ratings')
  rate(@Req() req: AuthenticatedRequest, @Body() dto: CreateRatingDto) {
    return this.trust.rate(req.user, dto);
  }

  @Get('profiles/:accountId/ratings')
  ratings(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.trust.ratings(accountId);
  }

  @UseGuards(AuthGuard)
  @Post('favorites')
  favorite(@Req() req: AuthenticatedRequest, @Body() dto: CreateFavoriteDto) {
    return this.trust.favorite(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('favorites/:accountId')
  unfavorite(
    @Req() req: AuthenticatedRequest,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.trust.unfavorite(req.user, accountId);
  }

  @UseGuards(AuthGuard)
  @Get('me/favorites')
  favorites(@Req() req: AuthenticatedRequest) {
    return this.trust.favorites(req.user);
  }

  @UseGuards(AuthGuard)
  @Post('safety/reports')
  report(@Req() req: AuthenticatedRequest, @Body() dto: CreateReportDto) {
    return this.trust.report(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Post('safety/blocks/:accountId')
  block(
    @Req() req: AuthenticatedRequest,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.trust.block(req.user, accountId);
  }

  @UseGuards(AuthGuard)
  @Delete('safety/blocks/:accountId')
  unblock(
    @Req() req: AuthenticatedRequest,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.trust.unblock(req.user, accountId);
  }

  @Get('profiles/:accountId/verification')
  verification(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.trust.publicVerification(accountId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
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
  @Post('admin/verifications')
  setVerification(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetVerificationDto,
  ) {
    return this.trust.setVerification(req.user, dto);
  }
}
