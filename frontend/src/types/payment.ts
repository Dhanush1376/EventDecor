/**
 * Canonical Payment Domain Types
 */

export type PaymentMethod = 'razorpay' | 'cod' | 'wallet' | 'offline';

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
  };
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationPayload {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  orderId?: string;
}

export interface CodOtpPayload {
  orderId?: string;
  phone?: string;
  otp: string;
}

export interface PaymentSummary {
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: string;
  transactionId?: string;
  paidAt?: string;
}
