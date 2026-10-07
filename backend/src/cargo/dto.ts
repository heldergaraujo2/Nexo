import { ArrayMaxSize, IsArray, IsInt, IsMimeType, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CargoMediaDto {
  @IsString() @MaxLength(500) @Matches(/^(?!\/)(?!.*\.\.)[^\\]+$/) objectKey!: string;
  @IsMimeType() mimeType!: string;
  @IsInt() @Min(1) @Max(50_000_000) byteSize!: number;
  @IsString() @Matches(/^[a-fA-F0-9]{64}$/) checksumSha256!: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
}

export class CreateCargoRequestDto {
  @IsObject() origin!: Record<string, unknown>;
  @IsObject() destination!: Record<string, unknown>;
  @IsString() @MaxLength(4000) cargoDescription!: string;
  @IsOptional() @IsInt() @Min(1) weightGrams?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5_000_000) lengthMm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5_000_000) widthMm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5_000_000) heightMm?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) media?: CargoMediaDto[];
}

export class CargoProposalDto {
  @IsInt() @Min(0) amountCents!: number;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

export class CargoTransitionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
