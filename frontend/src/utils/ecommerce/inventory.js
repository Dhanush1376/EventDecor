/**
 * Inventory helpers mirroring backend InventoryService.tracksStock / availableQuantity.
 * Products without an inventoryMode are treated as 'tracked'.
 */
export const isMadeToOrder = (product) => product?.inventoryMode === 'made_to_order';

/** Purchasable units for a product, or Infinity when made to order. Unknown stock is not limited. */
export const getPurchasableStock = (product) => {
  if (isMadeToOrder(product)) return Infinity;
  const stock = Number(product?.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : Infinity;
};
