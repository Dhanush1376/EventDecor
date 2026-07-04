import { randomUUID } from 'crypto';

/**
 * Generates a generic UUID
 */
export const generateUuid = (): string => {
  return randomUUID();
};

/**
 * Generates a unique UUID for a product (Stable reference for QR Codes)
 */
export const generateProductUuid = (): string => {
  return randomUUID();
};

/**
 * Generates a unique UUID for an order (Event sourcing reference)
 */
export const generateOrderUuid = (): string => {
  return randomUUID();
};

/**
 * Generates a unique Tracking ID for shipments
 */
export const generateTrackingId = (prefix: string = 'TRK'): string => {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
};
