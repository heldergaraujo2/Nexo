import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TowingController } from './towing.controller';
import { TowingService } from './towing.service';

@Module({
  imports: [AuthModule],
  controllers: [TowingController],
  providers: [TowingService],
  exports: [TowingService],
})
export class TowingModule {}
