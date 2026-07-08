const crypto = require('crypto');

export const forensicHashId = (id) => {
  if (!id) return 'null';
  try {
    // In browser, crypto might not be available like this if not polyfilled,
    // fallback to a simple hash if needed, but assuming crypto-browserify is present.
    // Actually, Web Crypto API is safer:
    // But since it's sync, let's use a simple string hash if crypto isn't available.
    if (typeof crypto.createHash === 'function') {
      return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 12);
    }
  } catch (e) {
    // ignore
  }

  // simple string hash fallback for synchronous browser usage
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 12);
};

export const logCartTrace = (event, data = {}) => {
  const ts = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const wc = Date.now();

  // Safely extract cart counts
  let purchaseItemCount = data.purchaseItemCount;
  let rentalItemCount = data.rentalItemCount;
  let productIdHashes = data.productIdHashes || [];

  if (data.cartData) {
    const pItems = data.cartData?.purchaseCart?.items || [];
    const rItems = data.cartData?.rentalCart?.items || [];
    purchaseItemCount = pItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
    rentalItemCount = rItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
    productIdHashes = [
      ...pItems.map((i) => forensicHashId(i.product?._id || i.product?.id || i.id)),
      ...rItems.map((i) => forensicHashId(i.product?._id || i.product?.id || i.id)),
    ];
  }

  // Format for the console
  const logData = {
    timestamp: ts,
    wallClock: wc,
    event,
    purchaseItemCount,
    rentalItemCount,
    productIdHashes,
    ...data,
  };

  // Remove cartData from final output to avoid noise
  delete logData.cartData;

  try {
    throw new Error();
  } catch (e) {
    // Extract a short stack trace for context
    const stack = e.stack.split('\\n').slice(2, 5).join(' | ');
    logData.stack = stack;
  }

  console.log(`[CART_STATE_TRACE][${event}]`, logData);
};
