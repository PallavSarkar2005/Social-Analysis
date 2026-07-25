/**
 * Abstract payment provider interface.
 * Concrete providers (Razorpay, Stripe, …) must implement these methods.
 */
export class PaymentProvider {
  get name() {
    throw new Error("PaymentProvider.name must be implemented");
  }

  async createOrder(_options) {
    throw new Error("createOrder must be implemented");
  }

  verifyPaymentSignature(_payload) {
    throw new Error("verifyPaymentSignature must be implemented");
  }

  verifyWebhookSignature(_rawBody, _signature) {
    throw new Error("verifyWebhookSignature must be implemented");
  }

  async fetchPayment(_paymentId) {
    throw new Error("fetchPayment must be implemented");
  }
}

export default PaymentProvider;
