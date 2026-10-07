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
} from '@nestjs/common';
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
