import { MiddlewareConsumer, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MediaModule } from './media/media.module';
import { TrustModule } from './trust/trust.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { RideModule } from './ride/ride.module';
import { PaymentModule } from './payment/payment.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { SecurityModule } from './security/security.module';
import { DeliveryModule } from './delivery/delivery.module';
import { CargoModule } from './cargo/cargo.module';
import { TowingModule } from './towing/towing.module';
import { GrowthModule } from './growth/growth.module';
import { RequestContextMiddleware } from './observability/request-context.middleware';

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
    SubscriptionModule,
    SecurityModule,
    DeliveryModule,
    CargoModule,
    TowingModule,
    GrowthModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
