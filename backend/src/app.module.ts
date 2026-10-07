import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MediaModule } from './media/media.module';
import { TrustModule } from './trust/trust.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { RideModule } from './ride/ride.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    MediaModule,
    TrustModule,
    MarketplaceModule,
    RideModule,
  ],
})
export class AppModule {}
