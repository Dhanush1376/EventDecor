export const getProductRoute = (itemType, productId) => {
  return itemType === 'event' ? `/events/${productId}` : `/product/${productId}`;
};
