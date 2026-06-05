import { InventoryService } from '../services/InventoryService';
import InventoryReservation from '../models/InventoryReservation';
import Product from '../models/Product';
import InventoryLog from '../models/InventoryLog';

jest.mock('../models/InventoryReservation');
jest.mock('../models/Product');
jest.mock('../models/InventoryLog');

describe('InventoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reserves inventory using atomic $inc with pre-conditions', async () => {
    const mockSession = { id: 'session_123' } as any;

    // Mock successful atomic reservation
    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'prod_1',
      stock: 10,
      reservedStock: 2,
    });
    (InventoryReservation.create as jest.Mock).mockResolvedValue([{ _id: 'res_1' }]);
    (InventoryLog.create as jest.Mock).mockResolvedValue([{ _id: 'log_1' }]);

    const reservation = await InventoryService.reserveInventory(
      'prod_1',
      2,
      'user_1',
      15,
      mockSession,
    );

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: 'prod_1',
        isActive: true,
        $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, 2] },
      },
      { $inc: { reservedStock: 2 } },
      { session: mockSession, returnDocument: 'after' },
    );
    expect(InventoryReservation.create).toHaveBeenCalled();
    expect(reservation._id).toBe('res_1');
  });

  it('throws error if stock is insufficient', async () => {
    const mockSession = { id: 'session_123' } as any;

    // Mock atomic reservation returning null (condition failed)
    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

    // Mock Product.findById chain
    (Product.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        session: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ stock: 2, reservedStock: 0, isActive: true }),
        }),
      }),
    });

    await expect(
      InventoryService.reserveInventory('prod_1', 5, 'user_1', 15, mockSession),
    ).rejects.toThrow('Insufficient stock. Only 2 available.');
  });

  it('confirms reservation by moving reservedStock to final fulfillment', async () => {
    const mockSession = { id: 'session_123' } as any;
    const mockRes = {
      _id: 'res_1',
      product: 'prod_1',
      quantity: 2,
      status: 'reserved',
      save: jest.fn(),
    };

    // Mock findById chain
    (InventoryReservation.findById as jest.Mock).mockReturnValue({
      session: jest.fn().mockResolvedValue(mockRes),
    });

    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'prod_1',
      stock: 8,
      reservedStock: 0,
    });

    await InventoryService.confirmReservation('res_1', mockSession);

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'prod_1' },
      { $inc: { stock: -2, reservedStock: -2 } },
      { session: mockSession, returnDocument: 'after' },
    );

    expect(InventoryLog.create).toHaveBeenCalled();
    expect(mockRes.save).toHaveBeenCalled();
    expect(mockRes.status).toBe('confirmed');
  });
});
