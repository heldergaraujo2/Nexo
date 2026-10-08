import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @IsIn(['car', 'motorcycle', 'truck', 'van', 'other']) vehicleType!:
    | 'car'
    | 'motorcycle'
    | 'truck'
    | 'van'
    | 'other';
  @IsString() @MaxLength(80) make!: string;
  @IsString() @MaxLength(80) model!: string;
  @IsOptional() @IsInt() @Min(1950) modelYear?: number;
  @IsOptional() @IsString() @MaxLength(4) plateLast4?: string;
}
export class CreateVerificationDto {
  @IsUUID() accountId!: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsIn(['identity', 'vehicle']) verificationType!: 'identity' | 'vehicle';
  @IsOptional() @IsString() @MaxLength(120) providerName?: string;
  @IsOptional() @IsString() @MaxLength(200) externalReference?: string;
}
export class ReviewVerificationDto {
  @IsIn(['pending', 'verified', 'rejected', 'expired', 'manual_review'])
  status!: 'pending' | 'verified' | 'rejected' | 'expired' | 'manual_review';
  @IsOptional() @IsString() @MaxLength(1000) resultSummary?: string;
}
export class CreateFraudFlagDto {
  @IsOptional() @IsUUID() accountId?: string;
  @IsOptional() @IsUUID() serviceId?: string;
  @IsString() @MaxLength(100) flagType!: string;
  @IsIn(['low', 'medium', 'high', 'critical']) severity!:
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';
  @IsString() @MaxLength(1000) reason!: string;
}
export class ReviewFraudFlagDto {
  @IsIn(['open', 'reviewing', 'resolved', 'dismissed']) status!:
    | 'open'
    | 'reviewing'
    | 'resolved'
    | 'dismissed';
  @IsOptional() @IsString() @MaxLength(1000) resolution?: string;
}
export class CreateIncidentDto {
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional() @IsUUID() safetyReportId?: string;
  @IsString() @MaxLength(100) category!: string;
  @IsIn(['low', 'normal', 'high', 'critical']) severity!:
    | 'low'
    | 'normal'
    | 'high'
    | 'critical';
  @IsString() @MaxLength(2000) summary!: string;
}
export class UpdateIncidentDto {
  @IsIn(['open', 'investigating', 'contained', 'resolved', 'closed']) status!:
    | 'open'
    | 'investigating'
    | 'contained'
    | 'resolved'
    | 'closed';
  @IsOptional() @IsString() @MaxLength(2000) resolution?: string;
  @IsOptional() @IsUUID() assignedTo?: string;
}
