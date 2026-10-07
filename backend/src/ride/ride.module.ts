import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import { HaversineDistanceAdapter } from './distance.adapter';

@Module({
  imports: [AuthModule],
  controllers: [RideController],
  providers: [RideService, HaversineDistanceAdapter],
  exports: [RideService],
})
export class RideModule {}
