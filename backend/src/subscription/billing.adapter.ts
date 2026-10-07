import { Injectable } from '@nestjs/common';
export interface BillingChargeResult { status:'succeeded'|'failed'; externalReference?:string; failureReason?:string; }
export interface BillingAdapter { charge(input:{providerId:string;subscriptionId:string;amountCents:number;currency:string;idempotencyKey:string}):Promise<BillingChargeResult>; }
@Injectable()
export class RecordingBillingAdapter implements BillingAdapter {
  async charge(input:{providerId:string;subscriptionId:string;amountCents:number;currency:string;idempotencyKey:string}):Promise<BillingChargeResult> {
    return {status:'succeeded',externalReference:`recorded:${input.subscriptionId}:${input.idempotencyKey}`};
  }
}
