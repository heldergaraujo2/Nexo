import { Injectable } from '@nestjs/common';
import { BillingAdapter } from './billing.adapter';
@Injectable()
export class BillingStub implements BillingAdapter {
 async charge(input:{providerId:string;subscriptionId:string;amountCents:number;currency:string;idempotencyKey:string}) { return {status:'succeeded' as const,externalReference:'stub:'+input.idempotencyKey}; }
}
