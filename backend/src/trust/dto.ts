import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRatingDto {
  @IsUUID() serviceId!: string;
  @IsUUID() subjectId!: string;
  @IsInt() @Min(1) @Max(5) score!: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

export class CreateFavoriteDto {
  @IsUUID() targetAccountId!: string;
}

export class CreateReportDto {
  @IsOptional() @IsUUID() targetAccountId?: string;
  @IsOptional() @IsUUID() serviceId?: string;
  @IsString() @MaxLength(80) category!: string;
  @IsString() @MaxLength(2000) description!: string;
}

export class ModerateRatingDto {
  @IsIn(['published', 'flagged', 'hidden', 'restored'])
  moderationState!: 'published' | 'flagged' | 'hidden' | 'restored';
}

export class ModerateReportDto {
  @IsIn(['open', 'reviewing', 'resolved', 'dismissed'])
  status!: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'critical'])
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export class SetVerificationDto {
  @IsUUID() accountId!: string;
  @IsIn(['identity', 'vehicle'])
  verificationType!: 'identity' | 'vehicle';
  @IsIn(['pending', 'verified', 'rejected', 'expired', 'manual_review'])
  status!: 'pending' | 'verified' | 'rejected' | 'expired' | 'manual_review';
  @IsString() @MaxLength(120) publicLabel!: string;
}
