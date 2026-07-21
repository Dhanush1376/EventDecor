import mongoose from 'mongoose';
import ScanEvent from '../models/ScanEvent';
import {
  QRVerificationService,
  QRPayload,
} from '../../../shared/services/barcode/QRVerificationService';
import { ScanPipeline } from './ScanPipeline';
import { ScanParserRegistry } from './scanParsers';
import logger from '../../../config/logger';
import ApiError from '../../../utils/ApiError';
import { IScanEvent } from '../types/scanEvent';

export class ScannerService {
  /**
   * Processes an incoming raw scan from a warehouse device.
   * Can be a barcode (SKU/AWB) or a signed QR code payload.
   */
  static async processScan(
    rawPayload: string,
    scannerId: string,
    scannedBy: string,
    location: any,
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let scanType: IScanEvent['entityType'] = 'unknown' as any;
      let decodedPayload: QRPayload | null = null;
      let referenceId = rawPayload;

      // Try decoding as QR Code
      decodedPayload = QRVerificationService.safeVerifyQrPayload(rawPayload);

      let handler;

      if (decodedPayload) {
        scanType = decodedPayload.type as any;
        referenceId =
          decodedPayload.entityId ||
          decodedPayload.productUuid ||
          decodedPayload.packageId ||
          rawPayload;
        handler = ScanParserRegistry.getHandlerForType(scanType);
      } else {
        // Find best match in registry based on prefix
        handler = ScanParserRegistry.getHandlerForPrefix(rawPayload);
        if (handler) {
          scanType = handler.entityType;
        } else {
          // Reject unknown barcodes instead of guessing "product"
          throw new ApiError(400, `Unrecognized barcode format: ${rawPayload}`);
        }
      }

      // Try to resolve the transaction if it's a domain barcode
      let transactionId: mongoose.Types.ObjectId | undefined = undefined;
      let domain: string | undefined = undefined;
      const Transaction = require('../../../models/Transaction').Transaction;

      if (scanType === 'transaction') {
        const txn = await Transaction.findOne({ transactionId: referenceId });
        if (txn) {
          transactionId = txn._id;
          domain = txn.domain;
        }
      } else if (['rental', 'event', 'custom', 'order'].includes(scanType)) {
        // Search transaction by referenceId or by the legacy string orderId
        // In our setup, Transaction.referenceId points to the ObjectId of the domain document
        // We'll need a generic lookup for this. For now, we leave transactionId undefined and resolve in pipeline
      }

      // Resolve the real scanning user so the audit trail records who scanned.
      const User = require('../../../models/User').default;
      const scannerUser = await User.findById(scannedBy).select('name role').lean();

      const scanEvent = new ScanEvent({
        scanId: `SCN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
        scanType: decodedPayload ? 'qr' : 'barcode',
        entityType: scanType,
        rawValue: rawPayload,
        entityId: referenceId,
        transactionId,
        domain,
        action: 'receive', // Default action to allow saving without error. The pipeline will determine the real action based on context.
        scannedBy: {
          userId: new mongoose.Types.ObjectId(scannedBy),
          name: scannerUser?.name || 'Unknown',
          role: scannerUser?.role || 'worker',
        },
        deviceType: 'camera',
        location,
        isOfflineSync: false,
        voiceConfirmation: false,
        timestamp: new Date(),
        metadata: { decodedPayload },
        result: 'success',
      });

      await scanEvent.save({ session });

      // Route through the Pipeline
      const pipelineResult = await ScanPipeline.process(scanEvent as any, session);

      scanEvent.result = pipelineResult.success ? 'success' : 'error';
      scanEvent.errorMessage = pipelineResult.errorMessage;
      await scanEvent.save({ session });

      await session.commitTransaction();

      if (!pipelineResult.success) {
        throw new ApiError(400, pipelineResult.errorMessage || 'Scan processing failed');
      }

      return scanEvent;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Scanner error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
