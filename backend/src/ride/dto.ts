import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class CoordinateDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

export class CreatePassengerRideDto {
  @IsIn(['car', 'motorcycle'])
  vehicleType!: 'car' | 'motorcycle';

  @ValidateNested()
  @Type(() => CoordinateDto)
  origin!: CoordinateDto;

  @ValidateNested()
  @Type(() => CoordinateDto)
  destination!: CoordinateDto;
}

export class ChangeRideRouteDto {
  @ValidateNested()
  @Type(() => CoordinateDto)
  origin!: CoordinateDto;

  @ValidateNested()
  @Type(() => CoordinateDto)
  destination!: CoordinateDto;

  @IsNumber()
  expectedRouteVersion!: number;
}

export class RideReasonDto {
  @IsObject()
  metadata?: Record<string, unknown>;
}


export class UpdateDriverLocationDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  speedMetersPerSecond?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  headingDegrees?: number;
}
