import { IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class RegisterMediaDto {
  @IsIn(['photo', 'video']) mediaType!: 'photo' | 'video';
  @IsString() @MaxLength(1024) objectKey!: string;
  @IsString() @MaxLength(200) mimeType!: string;
  @IsInt() @Min(1) @Max(50_000_000) byteSize!: number;
  @IsString() @MaxLength(128) checksumSha256!: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
  @IsOptional() @IsIn(['public', 'private']) visibility?: 'public' | 'private';
}
