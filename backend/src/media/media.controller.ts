import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RegisterMediaDto } from './dto';
import { MediaService } from './media.service';

@Controller()
export class MediaController {
  private readonly media: MediaService;

  constructor(@Inject(MediaService) media: MediaService) {
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
  public(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.media.public(accountId);
  }
}
