import { Body, Controller, Get, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateFraudFlagDto, CreateIncidentDto, CreateVehicleDto, CreateVerificationDto, ReviewFraudFlagDto, ReviewVerificationDto, UpdateIncidentDto } from './dto';
import { SecurityService } from './security.service';

@UseGuards(AuthGuard)
@Controller('security')
export class SecurityController {
  constructor(@Inject(SecurityService) private readonly security: SecurityService) {}
  @Post('vehicles') createVehicle(@Req() r:AuthenticatedRequest,@Body() d:CreateVehicleDto){return this.security.createVehicle(r.user,d);}
  @Get('vehicles') myVehicles(@Req() r:AuthenticatedRequest){return this.security.myVehicles(r.user);}
  @Post('incidents') createIncident(@Req() r:AuthenticatedRequest,@Body() d:CreateIncidentDto){return this.security.createIncident(r.user,d);}
  @UseGuards(RolesGuard) @Roles('admin','moderator') @Post('verifications') createVerification(@Req() r:AuthenticatedRequest,@Body() d:CreateVerificationDto){return this.security.requestVerification(r.user,d);}
  @UseGuards(RolesGuard) @Roles('admin','moderator') @Put('verifications/:id') reviewVerification(@Req() r:AuthenticatedRequest,@Param('id') id:string,@Body() d:ReviewVerificationDto){return this.security.reviewVerification(r.user,id,d);}
  @UseGuards(RolesGuard) @Roles('admin','moderator') @Post('fraud-flags') createFraud(@Req() r:AuthenticatedRequest,@Body() d:CreateFraudFlagDto){return this.security.createFraudFlag(r.user,d);}
  @UseGuards(RolesGuard) @Roles('admin','moderator') @Put('fraud-flags/:id') reviewFraud(@Req() r:AuthenticatedRequest,@Param('id') id:string,@Body() d:ReviewFraudFlagDto){return this.security.reviewFraudFlag(r.user,id,d);}
  @UseGuards(RolesGuard) @Roles('admin','moderator') @Get('incidents') listIncidents(@Req() r:AuthenticatedRequest){return this.security.listIncidents(r.user);}
  @UseGuards(RolesGuard) @Roles('admin','moderator') @Put('incidents/:id') updateIncident(@Req() r:AuthenticatedRequest,@Param('id') id:string,@Body() d:UpdateIncidentDto){return this.security.updateIncident(r.user,id,d);}
  @UseGuards(RolesGuard) @Roles('admin','moderator') @Get('events') events(@Req() r:AuthenticatedRequest){return this.security.securityEvents(r.user);}
}