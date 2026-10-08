import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [GrowthController],
  providers: [GrowthService],
})
export class GrowthModule {}
