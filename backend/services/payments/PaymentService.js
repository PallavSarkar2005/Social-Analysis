import { RazorpayProvider } from "./RazorpayProvider.js";

/**
 * Facade over concrete payment providers.
 * Swap providers without rewriting subscription/invoice logic.
 */
class PaymentService {
  constructor() {
    this.providers = new Map();
    this.defaultProviderName = "razorpay";
    this.register("razorpay", new RazorpayProvider());
  }

  register(name, provider) {
    this.providers.set(name, provider);
  }

  getProvider(name = this.defaultProviderName) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider "${name}" is not registered`);
    }
    return provider;
  }

  async createOrder(options, providerName) {
    return this.getProvider(providerName).createOrder(options);
  }

  verifyPaymentSignature(payload, providerName) {
    return this.getProvider(providerName).verifyPaymentSignature(payload);
  }

  verifyWebhookSignature(rawBody, signature, providerName) {
    return this.getProvider(providerName).verifyWebhookSignature(rawBody, signature);
  }

  async fetchPayment(paymentId, providerName) {
    return this.getProvider(providerName).fetchPayment(paymentId);
  }

  getPublicKey(providerName) {
    const provider = this.getProvider(providerName);
    return provider.keyId || process.env.RAZORPAY_KEY_ID || "";
  }
}

const paymentService = new PaymentService();
export default paymentService;
export { PaymentService };
