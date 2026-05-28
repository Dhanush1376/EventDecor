import type Razorpay from 'razorpay';
import logger from './logger';

let razorpayInstance: Razorpay | null = null;

export const getRazorpay = (): Razorpay | null => {
  if (razorpayInstance) return razorpayInstance;

  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    const RazorpayClass = require('razorpay');
    razorpayInstance = new RazorpayClass({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } else {
    logger.warn('Razorpay credentials missing. Payment features will fail.');
  }

  return razorpayInstance;
};

export default getRazorpay;

