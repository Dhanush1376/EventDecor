import Razorpay from 'razorpay';
import logger from '../../config/logger';
import { razorpayCircuitBreaker } from '../CircuitBreaker';

/**
 * RazorpayGateway — Centralized wrapper for Razorpay API calls.
 * Implements circuit breaking, logging, and error mapping.
 */
export class RazorpayGateway {
  private static instance: Razorpay;

  /**
   * Lazy-loads and returns the Razorpay SDK instance.
   */
  private static getInstance(): Razorpay {
    if (!this.instance) {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay keys are not configured in environment variables.');
      }
      this.instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
    return this.instance;
  }

  /**
   * Creates a Razorpay Order
   */
  static async createOrder(options: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: any;
  }) {
    return razorpayCircuitBreaker.execute(async () => {
      logger.info(`[RAZORPAY GATEWAY] Creating order for receipt ${options.receipt}`);
      const razorpay = this.getInstance();
      return await razorpay.orders.create(options);
    });
  }

  /**
   * Fetches an existing Razorpay Order
   */
  static async getOrder(orderId: string) {
    return razorpayCircuitBreaker.execute(async () => {
      const razorpay = this.getInstance();
      return await razorpay.orders.fetch(orderId);
    });
  }

  /**
   * Fetches payments for a Razorpay Order
   */
  static async getOrderPayments(orderId: string) {
    return razorpayCircuitBreaker.execute(async () => {
      const razorpay = this.getInstance();
      return await razorpay.orders.fetchPayments(orderId);
    });
  }

  /**
   * Fetches multiple Razorpay Orders (e.g. by receipt)
   */
  static async getAllOrders(options: {
    receipt?: string;
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }) {
    return razorpayCircuitBreaker.execute(async () => {
      const razorpay = this.getInstance();
      return await razorpay.orders.all(options);
    });
  }

  /**
   * Fetches an existing Razorpay Payment
   */
  static async getPayment(paymentId: string) {
    return razorpayCircuitBreaker.execute(async () => {
      const razorpay = this.getInstance();
      return await razorpay.payments.fetch(paymentId);
    });
  }

  /**
   * Fetches all refunds for a specific payment
   */
  static async getPaymentRefunds(paymentId: string) {
    return razorpayCircuitBreaker.execute(async () => {
      const razorpay = this.getInstance();
      return await (razorpay.payments as any).fetchRefunds(paymentId);
    });
  }

  /**
   * Initiates a Refund for a Payment
   */
  static async initiateRefund(
    paymentId: string,
    options: { amount: number; receipt?: string; notes?: any },
  ) {
    return razorpayCircuitBreaker.execute(async () => {
      logger.info(`[RAZORPAY GATEWAY] Initiating refund for payment ${paymentId}`);
      const razorpay = this.getInstance();
      return await razorpay.payments.refund(paymentId, options);
    });
  }

  /**
   * Fetch multiple payments
   */
  static async getAllPayments(options: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }) {
    return razorpayCircuitBreaker.execute(async () => {
      const razorpay = this.getInstance();
      return await razorpay.payments.all(options);
    });
  }

  /**
   * Fetch multiple refunds
   */
  static async getAllRefunds(options: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }) {
    return razorpayCircuitBreaker.execute(async () => {
      const razorpay = this.getInstance();
      return await razorpay.refunds.all(options);
    });
  }
}
