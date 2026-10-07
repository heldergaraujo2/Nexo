import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from './auth.types';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsString() @MinLength(2) @MaxLength(120) displayName!: string;
  @IsOptional() @IsIn(['customer', 'provider']) role?: UserRole;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}

export class RecoveryRequestDto {
  @IsEmail() email!: string;
}

export class ResetPasswordDto {
  @IsString() @Length(43, 43) @Matches(/^[A-Za-z0-9_-]+$/) token!: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword!: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) displayName?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional() @IsString() @MaxLength(1000) professionalInfo?: string;
  @IsOptional() @IsString() @MaxLength(2048) photoUrl?: string | null;
}
