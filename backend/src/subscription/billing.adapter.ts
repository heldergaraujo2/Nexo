export interface BillingCharge {
  status: 'succeeded' | 'failed';
  externalReference?: string;
  failureReason?: string;
}
export interface BillingAdapter {
  charge(input: {
    providerId: string;
    subscriptionId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<BillingCharge>;
}
