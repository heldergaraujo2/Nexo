import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PgInvalidTextRepresentationFilter } from './common/pg-invalid-text.filter';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MediaModule } from './media/media.module';
import { TrustModule } from './trust/trust.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { RideModule } from './ride/ride.module';
import { PaymentModule } from './payment/payment.module';
import { SecurityModule } from './security/security.module';
import { DeliveryModule } from './delivery/delivery.module';
import { CargoModule } from './cargo/cargo.module';
import { TowingModule } from './towing/towing.module';

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
    PaymentModule,
    SecurityModule,
    DeliveryModule,
    CargoModule,
    TowingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: PgInvalidTextRepresentationFilter },
  ],
})
export class AppModule {}
