import mongoose from 'mongoose';
import { IScanHandler, IScanHandlerResult, ScanParserRegistry } from './ScanParserRegistry';
import { IScanEvent } from '../../types/scanEvent';

export class TransactionScanHandler implements IScanHandler {
  prefix = 'TRN-';
  entityType = 'transaction' as const;

  async handle(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<IScanHandlerResult> {
    if (!scanEvent.transactionId) {
      return { success: false, errorMessage: 'Transaction ID not found for this barcode' };
    }

    const Transaction = require('../../../../models/Transaction').Transaction;
    const txn = await Transaction.findById(scanEvent.transactionId).session(session);
    if (!txn) return { success: false, errorMessage: 'Transaction not found' };

    const Fulfilment = require('../../../../models/Fulfilment').default;
    const fulfilment = await Fulfilment.findOne({ transactionId: txn._id }).session(session);

    if (fulfilment) {
      scanEvent.action = 'verify';
      await scanEvent.save({ session });

      await (fulfilment as any).addEvent(
        'PROCESSING',
        `Warehouse scan verified by ${scanEvent.scannedBy.name}`,
        scanEvent.location?.warehouseId || 'Main Warehouse',
        { scanId: scanEvent.scanId },
      );
      return { success: true };
    }

    return { success: false, errorMessage: 'Fulfilment record not found for transaction' };
  }
}

ScanParserRegistry.register(new TransactionScanHandler());

export class DomainScanHandler implements IScanHandler {
  prefix = null;
  entityType = 'order' as const; // We map rental/event/custom/order to their specific types, but they were combined in old logic. Let's make an abstract one for these, or register multiple.

  async handle(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<IScanHandlerResult> {
    scanEvent.action = 'verify';
    await scanEvent.save({ session });
    return { success: true };
  }
}

ScanParserRegistry.register(new DomainScanHandler());
