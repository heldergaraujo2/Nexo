import { Injectable } from '@nestjs/common';
import { BillingAdapter, BillingCharge } from './billing.adapter';

@Injectable()
export class BillingStub implements BillingAdapter {
  async charge(input: {
    providerId: string;
    subscriptionId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<BillingCharge> {
    if (process.env.NODE_ENV === 'production') {
      return {
        status: 'failed',
        failureReason: 'External billing adapter not configured',
      };
    }
    return {
      status: 'succeeded',
      externalReference: 'stub:' + input.idempotencyKey,
    };
  }
}
