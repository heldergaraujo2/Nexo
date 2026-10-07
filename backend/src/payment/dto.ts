import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePaymentRecordDto {
  @IsIn(['cash', 'pix', 'provider_card_machine'])
  method!: 'cash' | 'pix' | 'provider_card_machine';

  @IsString()
  @IsOptional()
  @MaxLength(128)
  externalReference?: string;
}

export class ConfirmPaymentDto {
  @IsInt()
  @Min(0)
  confirmedAmountCents!: number;
}

export class DisputePaymentDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
