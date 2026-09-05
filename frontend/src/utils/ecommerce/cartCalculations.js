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
    let itemPrice = item.price || item.product?.price || 0;

    if (cartType === 'rental') {
      const rentalPricing = item.product?.rentalPricing || item.rentalPricing;
      if (rentalPricing?.rentalPrice !== undefined && rentalPricing?.rentalPrice !== null) {
        itemPrice = Number(rentalPricing.rentalPrice) || 0;
      }
    }

    return sum + itemPrice * item.quantity;
  }, 0);

  let depositTotal = 0;
  if (cartType === 'rental') {
    depositTotal = items.reduce(
      (sum, item) =>
        sum +
        (item.deposit ||
          item.product?.deposit ||
          item.product?.securityDeposit ||
          item.securityDeposit ||
          0) *
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
    .map((item) => {
      const isRental = item.type === 'rental';
      let itemPrice = item.price ?? item.product?.price ?? 0;
      if (isRental) {
        const rentalPricing = item.product?.rentalPricing || item.rentalPricing;
        if (rentalPricing?.rentalPrice !== undefined && rentalPricing?.rentalPrice !== null) {
          itemPrice = Number(rentalPricing.rentalPrice) || 0;
        }
      }

      const itemId = item.product._id || item.product.id || item._id || item.id;

      return {
        id: itemId,
        _id: itemId,
        title: item.product.title || item.title,
        price: itemPrice,
        oldPrice: isRental ? itemPrice : item.product.oldPrice || item.product.price || item.price,
        stock: isRental
          ? Number(item.product.rentalStock) > 0
            ? Number(item.product.rentalStock)
            : Number(item.product.stock) > 0
              ? Number(item.product.stock)
              : 10
          : (item.product.stock ?? 10),
        seller: item.product.seller || 'Siri Arts & Crafts Artisans',
        rating: item.product.rating || 0,
        imageSrc:
          item.product.imageSrc ||
          (item.product.images?.length > 0 ? item.product.images[0] : null) ||
          item.imageSrc,
        category: item.product.category || item.category,
        quantity: item.quantity,
        variant: item.variant || 'Default',
        type: item.type || 'purchase',
        rentalInfo: cleanRentalInfo(item.rentalInfo),
        deposit:
          item.deposit ||
          item.product?.deposit ||
          item.product?.securityDeposit ||
          item.securityDeposit ||
          0,
        isNonRefundable: item.product.isNonRefundable ?? item.isNonRefundable,
        customizationConfig: item.product.customizationConfig,
        product: item.product,
      };
    });
}
