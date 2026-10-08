import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ClaimReferralDto,
  CreateCampaignDto,
  MetricsRangeDto,
  RedeemCampaignDto,
} from './dto';
import { GrowthService } from './growth.service';

@UseGuards(AuthGuard)
@Controller()
export class GrowthController {
  constructor(@Inject(GrowthService) private readonly growth: GrowthService) {}

  @Get('growth/me/referral-code')
  referralCode(@Req() req: AuthenticatedRequest) {
    return this.growth.referralCode(req.user);
  }

  @Post('growth/referrals/claim')
  claimReferral(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: ClaimReferralDto,
  ) {
    return this.growth.claimReferral(req.user, dto, key);
  }

  @Get('growth/campaigns')
  campaigns() {
    return this.growth.campaigns();
  }

  @Post('growth/campaigns/redeem')
  redeemCampaign(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
    @Body() dto: RedeemCampaignDto,
  ) {
    return this.growth.redeemCampaign(req.user, dto, key);
  }

  @Post('growth/founders/enroll')
  enrollFounder(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string,
  ) {
    return this.growth.enrollFounder(req.user, key);
  }

  @Get('growth/me/recurring-customers')
  recurringCustomers(@Req() req: AuthenticatedRequest) {
    return this.growth.recurringCustomers(req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/growth/metrics/acquisition')
  acquisition(@Query() query: MetricsRangeDto) {
    return this.growth.acquisitionMetrics(query);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/growth/metrics/supply-demand')
  supplyDemand(@Query() query: MetricsRangeDto) {
    return this.growth.supplyDemandMetrics(query);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/growth/metrics/conversion')
  conversion(@Query() query: MetricsRangeDto) {
    return this.growth.conversionMetrics(query);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/growth/metrics/retention')
  retention(@Query() query: MetricsRangeDto) {
    return this.growth.retentionMetrics(query);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @Post('admin/growth/campaigns')
  createCampaign(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.growth.createCampaign(req.user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/growth/referrals')
  referrals() {
    return this.growth.referrals();
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/growth/founders')
  founders() {
    return this.growth.founders();
  }
}
