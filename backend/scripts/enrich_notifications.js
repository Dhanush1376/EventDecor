const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const InAppNotification = mongoose.connection.collection('inappnotifications');
  const EventJob = mongoose.connection.collection('eventjobs');
  const ShowcaseCollection = mongoose.connection.collection('showcasecollections');
  const Event = mongoose.connection.collection('events');
  const Order = mongoose.connection.collection('orders');
  const Product = mongoose.connection.collection('products');
  const CustomOrder = mongoose.connection.collection('customorders');

  const notifs = await InAppNotification.find({}).toArray();
  console.log(`Checking ${notifs.length} total notifications...`);

  let updatedCount = 0;

  for (const notif of notifs) {
    let currentImage =
      notif.metadata?.imageSrc ||
      notif.metadata?.image ||
      notif.metadata?.thumbnail ||
      notif.metadata?.productImage;

    if (!currentImage) {
      // Try resolving based on type and metadata
      if (notif.type === 'booking' || notif.title?.toLowerCase().includes('booking')) {
        const bookingId = notif.metadata?.bookingId;
        const entityId = notif.metadata?.entityId;

        let booking = null;
        if (bookingId) {
          try {
            booking = await EventJob.findOne({ _id: new mongoose.Types.ObjectId(bookingId) });
          } catch (e) {}
        }
        if (!booking && entityId) {
          booking = await EventJob.findOne({ bookingId: entityId });
        }

        if (booking) {
          if (booking.inspirationImages && booking.inspirationImages.length > 0) {
            currentImage = booking.inspirationImages[0];
          }

          if (!currentImage && booking.eventPackage) {
            try {
              const showcase = await ShowcaseCollection.findOne({
                _id: new mongoose.Types.ObjectId(booking.eventPackage),
              });
              if (showcase) {
                currentImage = showcase.image || showcase.gallery?.[0];
              }
            } catch (e) {}

            if (!currentImage) {
              try {
                const ev = await Event.findOne({
                  _id: new mongoose.Types.ObjectId(booking.eventPackage),
                });
                if (ev) {
                  currentImage = ev.image || ev.gallery?.[0];
                }
              } catch (e) {}
            }
          }

          if (!currentImage && booking.title) {
            const cleanTitle = booking.title
              .replace(/^rent:\s*/i, '')
              .replace(/\s*booking$/i, '')
              .trim();
            const showcase = await ShowcaseCollection.findOne({
              title: { $regex: new RegExp(cleanTitle, 'i') },
            });
            if (showcase) {
              currentImage = showcase.image || showcase.gallery?.[0];
            } else {
              const ev = await Event.findOne({
                title: { $regex: new RegExp(cleanTitle, 'i') },
              });
              if (ev) {
                currentImage = ev.image;
              } else {
                const prod = await Product.findOne({
                  title: { $regex: new RegExp(cleanTitle, 'i') },
                });
                if (prod) {
                  currentImage = prod.imageSrc || prod.images?.[0]?.url;
                }
              }
            }
          }
        }
      } else if (notif.type === 'order' || notif.title?.toLowerCase().includes('order')) {
        const orderId = notif.metadata?.orderId;
        let order = null;
        if (orderId) {
          try {
            order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
          } catch (e) {}
        }
        if (order && order.items && order.items.length > 0) {
          currentImage = order.items[0].imageSrc || order.items[0].image;
        }

        if (!currentImage && notif.metadata?.customOrderId) {
          try {
            const co = await CustomOrder.findOne({
              _id: new mongoose.Types.ObjectId(notif.metadata.customOrderId),
            });
            if (co) {
              currentImage =
                co.previewImage || co.inspirationImages?.[0] || co.referenceImages?.[0];
            }
          } catch (e) {}
        }
      }

      if (currentImage) {
        const metadata = notif.metadata || {};
        metadata.imageSrc = currentImage;
        metadata.image = currentImage;
        await InAppNotification.updateOne({ _id: notif._id }, { $set: { metadata } });
        console.log(
          `Enriched notification ${notif._id} (${notif.title}) with image: ${currentImage}`,
        );
        updatedCount++;
      }
    }
  }

  console.log(`Enriched ${updatedCount} notifications successfully.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
