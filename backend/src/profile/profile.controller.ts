import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from '../auth/dto';

@Controller()
export class ProfileController {
  private readonly profiles: ProfileService;

  constructor(@Inject(ProfileService) profiles: ProfileService) {
    this.profiles = profiles;
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.profiles.me(req.user);
  }

  @UseGuards(AuthGuard)
  @Put('me/profile')
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(req.user, dto);
  }

  @Get('profiles/:accountId') public(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.profiles.public(accountId);
  }
}
