import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateSubscriptionDto { @IsOptional() @IsString() @MaxLength(64) planCode?: string; }
export class CancelSubscriptionDto { @IsString() @MaxLength(500) reason!: string; }
export class SetSubscriptionStatusDto { @IsIn(['active','past_due','suspended','expired']) status!: 'active'|'past_due'|'suspended'|'expired'; }
