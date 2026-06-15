import { OrderQueryService } from '../services/orders/OrderQueryService';
import RentalService from '../services/rentalService';
import Order from '../models/Order';
import RentalOrder from '../models/RentalOrder';

jest.mock('../models/Order');
jest.mock('../models/RentalOrder');

describe('Order History Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OrderQueryService.getMyOrders', () => {
    it('applies the correct filter to exclude pending/processing/failed online orders', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'order_123', total: 1000 }]),
      });
      (Order.find as jest.Mock).mockImplementation(mockFind);
      (Order.countDocuments as jest.Mock).mockResolvedValue(1);

      const userId = 'user_abc';
      const result = await OrderQueryService.getMyOrders(userId, { page: 1, limit: 10 });

      expect(Order.find).toHaveBeenCalledWith({
        user: userId,
        $or: [
          { paymentMethod: 'cod' },
          { paymentStatus: { $nin: ['pending', 'processing', 'failed'] } },
        ],
      });
      expect(Order.countDocuments).toHaveBeenCalledWith({
        user: userId,
        $or: [
          { paymentMethod: 'cod' },
          { paymentStatus: { $nin: ['pending', 'processing', 'failed'] } },
        ],
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('RentalService.getMyRentals', () => {
    it('applies the correct filter to exclude pending/processing/failed online rental orders', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'rental_123', totalAmount: 1500 }]),
      });
      (RentalOrder.find as jest.Mock).mockImplementation(mockFind);
      (RentalOrder.countDocuments as jest.Mock).mockResolvedValue(1);

      const userId = 'user_abc';
      const result = await RentalService.getMyRentals(userId, { page: 1, limit: 10 });

      expect(RentalOrder.find).toHaveBeenCalledWith({
        user: userId,
        $or: [
          { paymentMethod: 'cod' },
          { paymentStatus: { $nin: ['pending', 'processing', 'failed'] } },
        ],
      });
      expect(RentalOrder.countDocuments).toHaveBeenCalledWith({
        user: userId,
        $or: [
          { paymentMethod: 'cod' },
          { paymentStatus: { $nin: ['pending', 'processing', 'failed'] } },
        ],
      });
      expect(result.data).toHaveLength(1);
    });
  });
});
