import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';

@Module({
  imports: [AuthModule],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService],
})
export class RideModule {}
