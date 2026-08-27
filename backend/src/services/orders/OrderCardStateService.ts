import mongoose from 'mongoose';
import ReturnRequest from '../../models/ReturnRequest';
import ExchangeRequest from '../../models/ExchangeRequest';

export type OrderCardState =
  | 'normal'
  | 'return_active'
  | 'exchange_active'
  | 'return_and_exchange_active'
  | 'return_completed'
  | 'exchange_completed'
  | 'all_completed';

export class OrderCardStateService {
  /**
   * Derive the true, definitive state of the order card strictly from database state.
   */
  static async getCardState(orderId: string | mongoose.Types.ObjectId): Promise<OrderCardState> {
    const returns = await ReturnRequest.find({
      orderId,
      returnType: 'return',
    }).lean();

    const exchanges = await ReturnRequest.find({
      orderId,
      returnType: 'exchange',
    }).lean();

    let hasActiveReturn = false;
    let hasCompletedReturn = false;

    for (const r of returns) {
      if (['completed'].includes(r.status)) {
        hasCompletedReturn = true;
      } else if (!['cancelled', 'rejected'].includes(r.status)) {
        hasActiveReturn = true;
      }
    }

    let hasActiveExchange = false;
    let hasCompletedExchange = false;

    // A true exchange completion requires the ExchangeRequest replacementStatus to be 'delivered' (or similar terminal state)
    // However, for the order card state, if the underlying ReturnRequest is complete and the ExchangeRequest is complete.
    if (exchanges.length > 0) {
      const exchangeIds = exchanges.map((e) => e._id);
      const exchangeRequests = await ExchangeRequest.find({
        returnRequestId: { $in: exchangeIds },
      }).lean();

      for (const er of exchangeRequests) {
        // Find corresponding return
        const r = exchanges.find((e) => e._id.toString() === er.returnRequestId.toString());
        const isReturnActive = r && !['cancelled', 'rejected', 'completed'].includes(r.status);
        const isReturnCompleted = r && r.status === 'completed';

        // An exchange is active if either the return part is active OR the replacement part is not yet delivered/completed
        if (
          isReturnActive ||
          !['delivered', 'completed', 'cancelled'].includes(er.replacementStatus)
        ) {
          hasActiveExchange = true;
        } else if (isReturnCompleted && ['delivered', 'completed'].includes(er.replacementStatus)) {
          hasCompletedExchange = true;
        }
      }
    }

    if (hasActiveReturn && hasActiveExchange) return 'return_and_exchange_active';
    if (hasActiveReturn) return 'return_active';
    if (hasActiveExchange) return 'exchange_active';

    if (hasCompletedReturn && hasCompletedExchange) return 'all_completed';
    if (hasCompletedReturn) return 'return_completed';
    if (hasCompletedExchange) return 'exchange_completed';

    return 'normal';
  }
}
