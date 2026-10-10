import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMimeType,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DeliveryMediaDto {
  @IsString()
  @MaxLength(500)
  @Matches(/^(?!\/)(?!.*\.\.)[^\\]+$/)
  objectKey!: string;
  @IsMimeType() mimeType!: string;
  @IsInt() @Min(1) @Max(50_000_000) byteSize!: number;
  @IsString() @Matches(/^[a-fA-F0-9]{64}$/) checksumSha256!: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
}

export class CreateDeliveryRequestDto {
  @IsObject() origin!: Record<string, unknown>;
  @IsObject() destination!: Record<string, unknown>;
  @IsString() @MaxLength(4000) itemDescription!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) media?: DeliveryMediaDto[];
}

export class DeliveryTransitionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
