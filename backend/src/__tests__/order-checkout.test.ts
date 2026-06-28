import { OrderCheckoutService } from '../services/orders/OrderCheckoutService';
import Order from '../models/Order';
import User from '../models/User';
import { InventoryService } from '../services/InventoryService';
import { RazorpayGateway } from '../utils/payment/RazorpayGateway';
import Product from '../models/Product';

jest.mock('../models/Order');
jest.mock('../models/User');
jest.mock('../models/Product');
jest.mock('../services/InventoryService');
jest.mock('../utils/payment/RazorpayGateway');
jest.mock('../models/OutboxEvent');
jest.mock('../models/StoreSettings', () => ({
  findOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null),
  }),
  create: jest.fn().mockResolvedValue({
    orders: { maxQuantityPerItem: 10, maxItemsPerOrder: 50 },
    shipping: { freeShippingThreshold: 5000, deliveryCharge: 100 },
    payments: { codFee: 50 },
  }),
}));
jest.mock('../services/StoreSettingsService', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn().mockResolvedValue({
      orders: { maxQuantityPerItem: 10, maxItemsPerOrder: 50 },
      shipping: { freeShippingThreshold: 5000, deliveryCharge: 100 },
      payments: { codFee: 50 },
    }),
  },
}));
jest.mock('../services/orders/OrderIdempotencyManager', () => ({
  OrderIdempotencyManager: {
    acquireLock: jest.fn().mockResolvedValue(true),
    getCachedResponse: jest.fn().mockResolvedValue(null),
    releaseLock: jest.fn().mockResolvedValue(true),
    cacheResponseAndReleaseLock: jest.fn().mockResolvedValue(true),
  },
}));

describe('OrderCheckoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock mongoose session for transaction support without actual DB connection
    const mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
      inTransaction: jest.fn().mockReturnValue(true),
    };
    jest.spyOn(require('mongoose'), 'startSession').mockResolvedValue(mockSession);
  });

  it('calculates totals and creates an online order with reservations', async () => {
    const mockUser = {
      _id: 'user_123',
      email: 'test@example.com',
      cart: [{ productId: 'prod_1', quantity: 2, price: 500 }],
      save: jest.fn(),
    };
    (User.findById as jest.Mock).mockReturnValue({
      session: jest.fn().mockResolvedValue(mockUser),
    });
    (Product.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue([
          {
            _id: 'prod_1',
            title: 'Product 1',
            price: 500,
            stock: 10,
            reservedStock: 0,
            isActive: true,
          },
        ]),
      }),
    });
    (InventoryService.reserveInventory as jest.Mock).mockResolvedValue({ _id: 'res_1' });
    (RazorpayGateway.createOrder as jest.Mock).mockResolvedValue({ id: 'rzp_order_123' });

    // Using mockImplementation properly returning array for create
    (Order as unknown as jest.Mock).mockImplementation((data) => ({
      _id: data._id || 'mock_order_id',
      toObject: jest.fn().mockReturnValue(data),
      save: jest.fn().mockResolvedValue(true),
    }));
    (Order.findByIdAndUpdate as jest.Mock).mockResolvedValue(true);

    const result = await OrderCheckoutService.createOrder('user_123', {
      items: [{ productId: 'prod_1', quantity: 2 }],
      shippingAddress: { address: '123 Test St' },
      paymentMethod: 'razorpay',
      idempotencyKey: 'idem_key_123',
    });

    expect(result.razorpayOrder.id).toBe('rzp_order_123');
    expect(InventoryService.reserveInventory).toHaveBeenCalled();
    expect(RazorpayGateway.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 110000 }), // 1100 * 100
    );
  });
});
