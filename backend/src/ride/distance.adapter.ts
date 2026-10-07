import { Injectable } from '@nestjs/common';

export type Coordinate = { latitude: number; longitude: number };

export interface DistanceAdapter {
  distanceMeters(origin: Coordinate, destination: Coordinate): number;
}

@Injectable()
export class HaversineDistanceAdapter implements DistanceAdapter {
  distanceMeters(origin: Coordinate, destination: Coordinate) {
    const earthRadiusMeters = 6_371_000;
    const p1 = origin.latitude * Math.PI / 180;
    const p2 = destination.latitude * Math.PI / 180;
    const dp = (destination.latitude - origin.latitude) * Math.PI / 180;
    const dl = (destination.longitude - origin.longitude) * Math.PI / 180;
    const h =
      Math.sin(dp / 2) ** 2 +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return Math.round(2 * earthRadiusMeters * Math.asin(Math.sqrt(h)));
  }
}
