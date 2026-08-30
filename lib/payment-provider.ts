export type PaymentOperationResult = {
  provider: string;
  reference: string;
  status: 'succeeded';
};

export interface PaymentProvider {
  confirmReservation(input: { reservationId: string; amountUzs: number; idempotencyKey: string }): Promise<PaymentOperationResult>;
  refundReservation(input: { reservationId: string; amountUzs: number; idempotencyKey: string }): Promise<PaymentOperationResult>;
  reconcile(input: { operationId: string; providerReference: string }): Promise<PaymentOperationResult>;
  chargeBilling(input: { billingId: string; amountUzs: number; idempotencyKey: string; productType: 'developer_subscription' | 'secondary_listing' | 'promotion' }): Promise<PaymentOperationResult>;
}

class SandboxPaymentProvider implements PaymentProvider {
  async confirmReservation(input: { idempotencyKey: string }): Promise<PaymentOperationResult> {
    return { provider: 'sandbox', reference: `pay:${input.idempotencyKey}`, status: 'succeeded' };
  }

  async refundReservation(input: { idempotencyKey: string }): Promise<PaymentOperationResult> {
    return { provider: 'sandbox', reference: `refund:${input.idempotencyKey}`, status: 'succeeded' };
  }

  async reconcile(input: { providerReference: string }): Promise<PaymentOperationResult> {
    return { provider: 'sandbox', reference: input.providerReference, status: 'succeeded' };
  }

  async chargeBilling(input: { idempotencyKey: string }): Promise<PaymentOperationResult> {
    return { provider: 'sandbox', reference: `billing:${input.idempotencyKey}`, status: 'succeeded' };
  }
}

export function paymentProvider(): PaymentProvider {
  return new SandboxPaymentProvider();
}
