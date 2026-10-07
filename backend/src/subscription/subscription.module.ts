import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {SubscriptionController} from './subscription.controller';
import {SubscriptionService} from './subscription.service';
import {RecordingBillingAdapter} from './billing.adapter';
@Module({imports:[AuthModule],controllers:[SubscriptionController],providers:[SubscriptionService,RecordingBillingAdapter,{provide:'BILLING_ADAPTER',useExisting:RecordingBillingAdapter}]})
export class SubscriptionModule{}
