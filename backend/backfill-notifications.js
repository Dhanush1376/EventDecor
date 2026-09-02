require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    const InAppNotification = mongoose.connection.collection('inappnotifications');
    const Order = mongoose.connection.collection('orders');
    const EventJob = mongoose.connection.collection('eventjobs');
    const CustomOrder = mongoose.connection.collection('customorders');

    const notifs = await InAppNotification.find({
      'metadata.entityId': { $exists: false },
    }).toArray();
    console.log('Found ' + notifs.length + ' notifications to backfill entityId');

    for (const notif of notifs) {
      let entityId = null;

      if (notif.type === 'order' || notif.type === 'payment') {
        const orderId = notif.metadata?.orderId;
        if (orderId) {
          const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
          if (order) {
            entityId = order.orderUuid || order._id.toString();
          }
        }

        const customOrderId = notif.metadata?.customOrderId;
        if (customOrderId && !entityId) {
          const co = await CustomOrder.findOne({ _id: new mongoose.Types.ObjectId(customOrderId) });
          if (co) {
            entityId = co.orderId || co._id.toString();
          }
        }
      } else if (notif.type === 'booking') {
        const bookingId = notif.metadata?.bookingId;
        if (bookingId) {
          const booking = await EventJob.findOne({ _id: new mongoose.Types.ObjectId(bookingId) });
          if (booking) {
            entityId = booking.bookingId || booking._id.toString();
          }
        }
      }

      if (entityId) {
        if (!notif.metadata) notif.metadata = {};
        notif.metadata.entityId = entityId;
        await InAppNotification.updateOne(
          { _id: notif._id },
          { $set: { metadata: notif.metadata } },
        );
        console.log('Updated notif entityId', notif._id);
      }
    }

    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
