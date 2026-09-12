import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { OrderRollbackService } from '../OrderRollbackService';
import WalletTransaction from '../../../models/WalletTransaction';
import * as walletMutations from '../../../utils/payment/walletMutations';

describe('Wallet Safety & Idempotency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(mongoose, 'startSession').mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    } as any);
  });

  describe('OrderRollbackService.rollbackWallet', () => {
    it('skips rollback if order.walletDeduction is 0 or undefined', async () => {
      const creditSpy = vi
        .spyOn(walletMutations, 'creditWalletBalance')
        .mockResolvedValue({} as any);
      const session = {} as mongoose.ClientSession;

      await OrderRollbackService.rollbackWallet(
        { _id: new mongoose.Types.ObjectId(), walletDeduction: 0 },
        session,
      );
      expect(creditSpy).not.toHaveBeenCalled();

      await OrderRollbackService.rollbackWallet({ _id: new mongoose.Types.ObjectId() }, session);
      expect(creditSpy).not.toHaveBeenCalled();
    });

    it('skips rollback if order.walletRefunded is already true', async () => {
      const creditSpy = vi
        .spyOn(walletMutations, 'creditWalletBalance')
        .mockResolvedValue({} as any);
      const session = {} as mongoose.ClientSession;

      const order = {
        _id: new mongoose.Types.ObjectId(),
        walletDeduction: 150,
        walletRefunded: true,
      };

      await OrderRollbackService.rollbackWallet(order, session);
      expect(creditSpy).not.toHaveBeenCalled();
    });

    it('skips rollback if a refund WalletTransaction already exists for the order', async () => {
      const creditSpy = vi
        .spyOn(walletMutations, 'creditWalletBalance')
        .mockResolvedValue({} as any);
      const session = {} as mongoose.ClientSession;
      const orderId = new mongoose.Types.ObjectId();

      vi.spyOn(WalletTransaction, 'findOne').mockReturnValue({
        session: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), amount: 200 }),
      } as any);

      const order = {
        _id: orderId,
        user: new mongoose.Types.ObjectId(),
        walletDeduction: 200,
        walletRefunded: false,
      };

      await OrderRollbackService.rollbackWallet(order, session);
      expect(creditSpy).not.toHaveBeenCalled();
      expect(order.walletRefunded).toBe(true);
    });

    it('successfully credits wallet and sets order.walletRefunded to true on first refund', async () => {
      const creditSpy = vi
        .spyOn(walletMutations, 'creditWalletBalance')
        .mockResolvedValue({} as any);
      const createSpy = vi.spyOn(WalletTransaction, 'create').mockResolvedValue([] as any);
      const session = {} as mongoose.ClientSession;
      const orderId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      vi.spyOn(WalletTransaction, 'findOne').mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      const order = {
        _id: orderId,
        user: userId,
        walletDeduction: 350,
        walletRefunded: false,
        invoiceNumber: 'INV-1001',
      };

      await OrderRollbackService.rollbackWallet(order, session);
      expect(creditSpy).toHaveBeenCalledWith(userId, 350, session);
      expect(createSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId,
            amount: 350,
            source: 'refund',
            orderId,
          }),
        ]),
        { session },
      );
      expect(order.walletRefunded).toBe(true);

      // Calling a second time on the same order object must immediately skip without second credit
      await OrderRollbackService.rollbackWallet(order, session);
      expect(creditSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('LoyaltyService purchase rewards & reversal safety', () => {
    it('skips processPurchaseRewards if order.rewardsProcessed is already true', async () => {
      const { LoyaltyService } = await import('../../loyaltyService');
      const Order = (await import('../../../models/Order')).default;
      const User = (await import('../../../models/User')).default;

      const orderId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const mockOrder = {
        _id: orderId,
        user: userId,
        subtotal: 1000,
        total: 1100,
        rewardsProcessed: true,
        save: vi.fn(),
      };

      const mockUser = {
        _id: userId,
        walletBalance: 100,
        siriCoins: 50,
      };

      vi.spyOn(Order, 'findById').mockReturnValue({
        session: vi.fn().mockResolvedValue(mockOrder),
      } as any);

      vi.spyOn(User, 'findById').mockReturnValue({
        session: vi.fn().mockResolvedValue(mockUser),
      } as any);

      const userUpdateSpy = vi.spyOn(User, 'findByIdAndUpdate');

      await LoyaltyService.processPurchaseRewards(userId.toString(), orderId.toString(), 1100);

      expect(userUpdateSpy).not.toHaveBeenCalled();
      expect(mockOrder.save).not.toHaveBeenCalled();
    });

    it('reversePurchaseRewards does NOT re-credit order.walletDeduction (preventing double refunds)', async () => {
      const { LoyaltyService } = await import('../../loyaltyService');
      const Order = (await import('../../../models/Order')).default;
      const User = (await import('../../../models/User')).default;

      const orderId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const mockOrder = {
        _id: orderId,
        user: userId,
        walletDeduction: 500,
        cashbackEarned: 20,
        coinsEarned: 10,
        save: vi.fn(),
      };

      const mockUser = {
        _id: userId,
        walletBalance: 600,
        siriCoins: 100,
      };

      vi.spyOn(Order, 'findById').mockReturnValue({
        session: vi.fn().mockResolvedValue(mockOrder),
      } as any);

      vi.spyOn(User, 'findById').mockReturnValue({
        session: vi.fn().mockResolvedValue(mockUser),
      } as any);

      vi.spyOn(WalletTransaction, 'findOne').mockReturnValue({
        session: vi.fn().mockResolvedValue(null),
      } as any);

      const createSpy = vi.spyOn(WalletTransaction, 'create').mockResolvedValue([] as any);
      const _userUpdateSpy = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({} as any);

      await LoyaltyService.reversePurchaseRewards(orderId.toString());

      // Should NEVER credit refund of walletDeduction in reversePurchaseRewards
      const refundCalls = createSpy.mock.calls.filter((call) =>
        call[0]?.some?.((tx: any) => tx.source === 'refund'),
      );
      expect(refundCalls.length).toBe(0);

      // Should record a reversal debit for the earned cashback only
      expect(createSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'reversal',
            type: 'debit',
            amount: 20,
            orderId,
          }),
        ]),
        expect.anything(),
      );

      expect(mockOrder.cashbackEarned).toBe(0);
      expect(mockOrder.coinsEarned).toBe(0);
    });
  });
});
