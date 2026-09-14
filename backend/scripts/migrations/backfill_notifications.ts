// @ts-nocheck
import mongoose from 'mongoose';
import InAppNotification from './src/models/InAppNotification';
import ReturnRequest from './src/models/ReturnRequest';
import ExchangeRequest from './src/models/ExchangeRequest';
import Order from './src/models/Order';
import './src/models/Product';
import dotenv from 'dotenv';
dotenv.config();

async function backfillNotifications() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eventdecor');

  const notifications = await InAppNotification.find({});
  let updatedCount = 0;

  for (const notif of notifications) {
    let entityId = notif.metadata?.entityId;
    let orderId = notif.metadata?.orderId;

    // Extract entity ID if missing
    if (!entityId && !orderId) {
      const match =
        notif.message.match(/(RET|EXC|ORD)-[0-9]+/) || notif.message.match(/#([0-9a-fA-F]{10,24})/);
      if (match) {
        if (match[1]) {
          orderId = match[1]; // Captured group 1 for Mongo IDs without the #
        } else {
          entityId = match[0];
        }
      }
    }

    if (entityId || orderId) {
      let imageSrc = null;
      let finalEntityId = entityId;

      try {
        if (entityId && entityId.startsWith('RET-')) {
          const rr = await ReturnRequest.findOne({ returnId: entityId });
          if (rr && rr.items && rr.items.length > 0) imageSrc = rr.items[0].imageSrc;
        } else if (entityId && entityId.startsWith('EXC-')) {
          const ex = await ExchangeRequest.findOne({ exchangeId: entityId });
          if (ex && ex.items && ex.items.length > 0) imageSrc = ex.items[0].imageSrc;
        } else if (orderId) {
          const ord = await Order.findById(orderId).populate('items.productId');
          if (ord) {
            if (ord.items && ord.items.length > 0) {
              imageSrc = ord.items[0].imageSrc || ord.items[0].productId?.imageSrc;
            }
            finalEntityId =
              ord.orderUuid || ord.orderId || `ORD-${ord._id.toString().slice(-6).toUpperCase()}`;
          }
        }

        let needsUpdate = false;
        const newMetadata = notif.metadata || {};

        if (imageSrc && newMetadata.imageSrc !== imageSrc) {
          newMetadata.imageSrc = imageSrc;
          needsUpdate = true;
        }

        if (finalEntityId && newMetadata.entityId !== finalEntityId) {
          newMetadata.entityId = finalEntityId;
          needsUpdate = true;
        }

        if (needsUpdate) {
          notif.metadata = newMetadata;
          notif.markModified('metadata');
          await notif.save();
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error processing ${entityId || orderId}:`, err);
      }
    }
  }

  console.log(`Backfilled ${updatedCount} notifications with images and entity IDs`);
  mongoose.disconnect();
}

backfillNotifications().catch(console.error);
