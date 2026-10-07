import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceRequestDto {
  @IsString()
  @MaxLength(80)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsObject()
  requirements?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  origin?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  destination?: Record<string, unknown>;
}

export class MarketplaceAvailabilityDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  categories!: string[];

  @IsIn(['offline', 'available', 'busy'])
  availability!: 'offline' | 'available' | 'busy';

  acceptingRequests!: boolean;
}

export class CreateOfferDto {
  @IsIn(['direct_accept', 'priced_offer'])
  offerType!: 'direct_accept' | 'priced_offer';

  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInMinutes?: number;
}

export class IdempotencyDto {
  @IsUUID()
  requestId!: string;
}

export class CancelDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
