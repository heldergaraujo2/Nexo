import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingStub } from './billing.stub';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
@Module({
  imports: [AuthModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    BillingStub,
    { provide: 'BILLING_ADAPTER', useExisting: BillingStub },
  ],
})
export class SubscriptionModule {}
