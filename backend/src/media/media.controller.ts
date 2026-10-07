import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RegisterMediaDto } from './dto';
import { MediaService } from './media.service';

@Controller()
export class MediaController {
  private readonly media: MediaService;

  constructor(media: MediaService) {
    this.media = media;
  }

  @UseGuards(AuthGuard)
  @Post('me/media')
  register(@Req() req: AuthenticatedRequest, @Body() dto: RegisterMediaDto) {
    return this.media.register(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Get('me/media')
  mine(@Req() req: AuthenticatedRequest) {
    return this.media.mine(req.user);
  }

  @Get('profiles/:accountId/media')
  public(@Param('accountId') accountId: string) {
    return this.media.public(accountId);
  }
}
