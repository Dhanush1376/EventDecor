import { logCartTrace, forensicHashId } from '../forensic/cartTrace';

export function cleanRentalInfo(rentalInfo) {
  if (!rentalInfo) return undefined;
  const { startDate, endDate } = rentalInfo;
  if (!startDate || !endDate) return undefined;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return undefined;
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const duration = Number(rentalInfo.duration) || diffDays;

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    duration,
  };
}

export function calculateCartSummary(items, cartType, shippingFee = 0) {
  const subtotal = items.reduce((sum, item) => {
    let itemPrice = item.product?.price || item.price || 0;

    if (cartType === 'rental' && item.rentalInfo?.startDate && item.rentalInfo?.endDate) {
      const start = new Date(item.rentalInfo.startDate);
      const end = new Date(item.rentalInfo.endDate);
      const diffDays =
        Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

      const rentalPricing = item.product?.rentalPricing || item.rentalPricing;
      if (rentalPricing) {
        if (diffDays >= 30 && rentalPricing.monthly > 0) {
          itemPrice = (rentalPricing.monthly / 30) * diffDays;
        } else if (diffDays >= 7 && rentalPricing.weekly > 0) {
          itemPrice = (rentalPricing.weekly / 7) * diffDays;
        } else if (rentalPricing.daily > 0) {
          itemPrice = rentalPricing.daily * diffDays;
        }
      }
    }

    return sum + itemPrice * item.quantity;
  }, 0);

  let depositTotal = 0;
  if (cartType === 'rental') {
    depositTotal = items.reduce(
      (sum, item) =>
        sum +
        (item.product?.deposit || item.deposit || item.product?.securityDeposit || 0) *
          item.quantity,
      0,
    );
  }

  const total = subtotal + depositTotal + shippingFee;

  return { subtotal, depositTotal, total };
}

export function transformDbCart(dbCartItems) {
  if (!dbCartItems || !Array.isArray(dbCartItems)) return [];
  return dbCartItems
    .filter((item) => {
      const isValid = !!item.product;
      if (!isValid) {
        logCartTrace('TRANSFORM_ITEM_REJECTED', {
          productHash: forensicHashId(
            item?.product?._id || item?.product?.id || item?._id || item?.id,
          ),
          reason: 'MISSING_PRODUCT',
          source: 'transformDbCart',
        });
      }
      return isValid;
    })
    .map((item) => ({
      id: item.product._id || item.product.id,
      _id: item.product._id || item.product.id,
      title: item.product.title,
      price: item.product.price,
      oldPrice: item.product.oldPrice || item.product.price,
      stock: item.product.stock ?? 10,
      seller: item.product.seller || 'Siri Arts & Crafts Artisans',
      rating: item.product.rating || 0,
      imageSrc:
        item.product.imageSrc || (item.product.images?.length > 0 ? item.product.images[0] : null),
      category: item.product.category,
      quantity: item.quantity,
      variant: item.variant || 'Default',
      type: item.type || 'purchase',
      rentalInfo: cleanRentalInfo(item.rentalInfo),
      deposit: item.deposit || 0,
      isNonRefundable: item.product.isNonRefundable,
      customizationConfig: item.product.customizationConfig,
      product: item.product,
    }));
}
