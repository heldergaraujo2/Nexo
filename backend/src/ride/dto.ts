import { IsIn, IsLatitude, IsLongitude, IsNumber } from 'class-validator';

export class CoordinateDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

export class CreatePassengerRideDto {
  @IsIn(['car', 'motorcycle'])
  vehicleType!: 'car' | 'motorcycle';

  origin!: CoordinateDto;
  destination!: CoordinateDto;
}

export class ChangeRideRouteDto {
  origin!: CoordinateDto;
  destination!: CoordinateDto;

  @IsNumber()
  expectedRouteVersion!: number;
}
