import { IsArray, IsObject, IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';

export class DeliveryMediaDto {
  @IsString() @MaxLength(500) objectKey!: string;
  @IsString() @MaxLength(120) mimeType!: string;
  @IsInt() @Min(0) byteSize!: number;
  @IsString() @MaxLength(64) checksumSha256!: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
}
export class CreateDeliveryRequestDto {
  @IsObject() origin!: Record<string, unknown>;
  @IsObject() destination!: Record<string, unknown>;
  @IsString() @MaxLength(4000) itemDescription!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsArray() media?: DeliveryMediaDto[];
}
export class DeliveryTransitionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}