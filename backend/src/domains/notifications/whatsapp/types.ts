export interface AutomationPayload {
  orderId?: string;
  userId?: string;
  productId?: string;
  currentStock?: number;
  bookingId?: string;
  [key: string]: any;
}

export interface AutomationContext {
  order?: any;
  customerStats?: any;
  products?: any[];
  inventoryData?: any[];
  fulfillment?: any;
  booking?: any;
  user?: any;
  [key: string]: any;
}

export interface VariableInfo {
  key: string;
  description: string;
  example: string;
  group: 'order' | 'customer' | 'address' | 'product' | 'warehouse' | 'system' | 'shipping';
}

export interface PriorityResult {
  badges: Badge[];
  priority: 'critical' | 'high' | 'normal' | 'low';
}

export interface Badge {
  emoji: string;
  label: string;
  color: string;
}

export interface ResolvedRecipient {
  phone: string;
  name: string;
  role: string;
  templateId?: string;
  recipientId: string;
}

export interface MediaAttachment {
  type: 'invoice' | 'shipping_label' | 'packing_slip' | 'qr_code' | 'product_image';
  url: string;
  filename: string;
}
