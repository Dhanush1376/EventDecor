import mongoose from 'mongoose';
import { IScanHandler, IScanHandlerResult, ScanParserRegistry } from './ScanParserRegistry';
import { IScanEvent } from '../../types/scanEvent';
import Package from '../../models/Package';
import PackageEvent from '../../models/PackageEvent';

export class PackageScanHandler implements IScanHandler {
  prefix = 'PKG-';
  entityType = 'package' as const;

  async handle(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<IScanHandlerResult> {
    const pkg = await Package.findOne({ packageId: scanEvent.entityId as string }).session(session);
    if (!pkg) return { success: false, errorMessage: 'Package not found' };

    // Advance state machine
    let nextStatus:
      | 'created'
      | 'items_verified'
      | 'packed'
      | 'sealed'
      | 'labeled'
      | 'ready_for_pickup'
      | 'shipped'
      | 'dispatched';
    let action: 'pick' | 'verify' | 'receive' | 'pack' | 'ship' | 'deliver' | 'return_receive';

    switch (pkg.status) {
      case 'created':
        nextStatus = 'items_verified';
        action = 'verify';
        break;
      case 'items_verified':
        nextStatus = 'packed';
        action = 'pack';
        break;
      case 'packed':
        nextStatus = 'sealed';
        action = 'pack';
        break;
      case 'sealed':
        nextStatus = 'labeled';
        action = 'pack';
        break;
      case 'labeled':
        nextStatus = 'ready_for_pickup';
        action = 'pack';
        break;
      case 'ready_for_pickup':
        // Dispatched should happen via Courier AWB scan or API, not generic PKG scan,
        // but if scanned by dispatch dock worker, it could be marked ready to ship.
        // For strictness, let's keep it here for now or reject.
        return {
          success: false,
          errorMessage: 'Package is already ready for pickup. Scan AWB to dispatch.',
        };
      case 'shipped':
      case 'dispatched':
        return { success: true }; // Idempotent success
      default:
        return { success: false, errorMessage: `Invalid package state: ${pkg.status}` };
    }

    if (nextStatus !== pkg.status) {
      // Optimistic Concurrency Control
      const updated = await Package.findOneAndUpdate(
        { _id: pkg._id, version: pkg.version },
        {
          $set: { status: nextStatus },
          $inc: { version: 1 },
        },
        { session, new: true },
      );

      if (!updated) {
        return {
          success: false,
          errorMessage: 'Package was updated by another process (Concurrency Error)',
        };
      }

      // Record Package Event Sourcing
      await PackageEvent.create(
        [
          {
            packageId: pkg._id,
            orderId: pkg.orderId,
            status: nextStatus,
            performedBy: scanEvent.scannedBy,
            scanId: scanEvent.scanId,
          },
        ],
        { session },
      );

      scanEvent.action = action;
      await scanEvent.save({ session });
    }

    return { success: true };
  }
}

ScanParserRegistry.register(new PackageScanHandler());
