import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { RideModule } from '../ride/ride.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [AuthModule, RideModule, DeliveryModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
