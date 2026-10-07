import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { AuthPrincipal } from '../auth/auth.types';
import {
  CancelDto,
  CreateOfferDto,
  CreateServiceRequestDto,
  MarketplaceAvailabilityDto,
} from './dto';
