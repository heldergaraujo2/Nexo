import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ClaimReferralDto {
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  code!: string;
}

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(64)
  code!: string;

  @IsOptional()
  @IsIn(['draft', 'active', 'ended'])
  status?: 'draft' | 'active' | 'ended';

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class RedeemCampaignDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  code!: string;
}

export class MetricsRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
