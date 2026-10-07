import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
export class CancelSubscriptionDto { @IsBoolean() @IsOptional() atPeriodEnd?: boolean; @IsString() @IsOptional() @MaxLength(200) reason?: string; }
export class BillingResultDto { @IsString() @MaxLength(128) externalReference!: string; }