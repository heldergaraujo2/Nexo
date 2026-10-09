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

export class TowingMediaDto {
  @IsString()
  @MaxLength(500)
  @Matches(/^(?!\/)(?!.*\.\.)[^\\]+$/)
  objectKey!: string;
  @IsMimeType() mimeType!: string;
  @IsInt() @Min(1) @Max(50_000_000) byteSize!: number;
  @IsString() @Matches(/^[a-fA-F0-9]{64}$/) checksumSha256!: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
}

export class CreateTowingRequestDto {
  @IsObject() origin!: Record<string, unknown>;
  @IsOptional() @IsObject() destination?: Record<string, unknown>;
  @IsString() @MaxLength(4000) problemDescription!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) media?: TowingMediaDto[];
}

export class TowingTransitionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
