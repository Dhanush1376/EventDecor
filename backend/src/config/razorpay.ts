import Razorpay from 'razorpay';
import logger from './logger';

let razorpay: Razorpay | null = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  logger.warn('Razorpay credentials missing. Payment features will fail.');
}

export default razorpay;
