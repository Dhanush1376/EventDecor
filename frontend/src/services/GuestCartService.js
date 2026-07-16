import { persistentStorage } from '../utils/storage/persistentStorage';
import { calculateCartSummary, cleanRentalInfo } from '../utils/ecommerce/cartCalculations';

const GUEST_CART_KEY = 'siri_guest_cart';
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

const defaultCart = {
  purchaseCart: {
    items: [],
    summary: { subtotal: 0, depositTotal: 0, total: 0, shippingFee: 0, platformFee: 0 },
  },
  rentalCart: {
    items: [],
    summary: { subtotal: 0, depositTotal: 0, total: 0, shippingFee: 0, platformFee: 0 },
  },
};

export const GuestCartService = {
  /**
   * Initializes the guest cart with metadata if not present
   */
  _ensureCartData(cart) {
    if (!cart) cart = { ...defaultCart };
    if (!cart.guestCartId) {
      cart.guestCartId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      cart.guestCartCreatedAt = new Date().toISOString();
    }
    cart.guestCartUpdatedAt = new Date().toISOString();

    // Ensure structure
    if (!cart.purchaseCart)
      cart.purchaseCart = { items: [], summary: { ...defaultCart.purchaseCart.summary } };
    if (!cart.rentalCart)
      cart.rentalCart = { items: [], summary: { ...defaultCart.rentalCart.summary } };

    return cart;
  },

  getCart() {
    let cart = persistentStorage.getItem(GUEST_CART_KEY, { fallback: defaultCart });
    return this._ensureCartData(cart);
  },

  saveCart(cart) {
    const updatedCart = this._ensureCartData(cart);
    persistentStorage.setItem(GUEST_CART_KEY, updatedCart, { ttl: TTL });
    return updatedCart;
  },

  clearCart() {
    persistentStorage.removeItem(GUEST_CART_KEY);
  },

  /**
   * Add or update item in guest cart
   */
  addToCart(product, quantity = 1, type = 'purchase', rentalInfo) {
    const cart = this.getCart();
    const targetCartKey = type === 'purchase' ? 'purchaseCart' : 'rentalCart';
    const items = cart[targetCartKey].items || [];

    const itemId = product._id || product.id;
    const existingIndex = items.findIndex(
      (item) => (item.product?._id || item.product?.id || item._id || item.id) === itemId,
    );

    let updatedItems;
    if (existingIndex >= 0) {
      updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: Math.min(50, updatedItems[existingIndex].quantity + quantity),
      };
    } else {
      updatedItems = [
        ...items,
        {
          id: itemId,
          _id: itemId,
          quantity: Math.min(50, quantity),
          type,
          product,
          rentalInfo: cleanRentalInfo(rentalInfo || product.rentalInfo),
          deposit: product.deposit || product.securityDeposit || 0,
        },
      ];
    }

    const { subtotal, depositTotal, total } = calculateCartSummary(
      updatedItems,
      type,
      cart[targetCartKey].summary?.shippingFee || 0,
    );

    cart[targetCartKey].items = updatedItems;
    cart[targetCartKey].summary = {
      ...(cart[targetCartKey].summary || defaultCart.purchaseCart.summary),
      subtotal,
      depositTotal,
      total,
    };

    return this.saveCart(cart);
  },

  removeFromCart(productId, type) {
    const cart = this.getCart();
    const targetCartKey = type === 'purchase' ? 'purchaseCart' : 'rentalCart';
    const items = cart[targetCartKey].items || [];

    const updatedItems = items.filter(
      (item) => (item.product?._id || item.product?.id || item._id || item.id) !== productId,
    );

    const { subtotal, depositTotal, total } = calculateCartSummary(
      updatedItems,
      type,
      cart[targetCartKey].summary?.shippingFee || 0,
    );

    cart[targetCartKey].items = updatedItems;
    cart[targetCartKey].summary = {
      ...(cart[targetCartKey].summary || defaultCart.purchaseCart.summary),
      subtotal,
      depositTotal,
      total,
    };

    return this.saveCart(cart);
  },

  updateQuantity(productId, quantity, type) {
    const cart = this.getCart();
    const targetCartKey = type === 'purchase' ? 'purchaseCart' : 'rentalCart';
    const items = cart[targetCartKey].items || [];

    const numericQuantity = Math.max(0, Math.min(50, Number(quantity) || 1));

    if (numericQuantity === 0) {
      return this.removeFromCart(productId, type);
    }

    const updatedItems = items.map((item) => {
      const id = item.product?._id || item.product?.id || item._id || item.id;
      if (id === productId) {
        return { ...item, quantity: numericQuantity };
      }
      return item;
    });

    const { subtotal, depositTotal, total } = calculateCartSummary(
      updatedItems,
      type,
      cart[targetCartKey].summary?.shippingFee || 0,
    );

    cart[targetCartKey].items = updatedItems;
    cart[targetCartKey].summary = {
      ...(cart[targetCartKey].summary || defaultCart.purchaseCart.summary),
      subtotal,
      depositTotal,
      total,
    };

    return this.saveCart(cart);
  },

  /**
   * Returns a flat array of all items for API syncing
   */
  getCartItemsForSync() {
    const cart = this.getCart();
    const allItems = [...(cart.purchaseCart?.items || []), ...(cart.rentalCart?.items || [])];

    return allItems.map((item) => ({
      product: item.product?._id || item.product?.id || item._id || item.id,
      quantity: item.quantity,
      type: item.type || 'purchase',
      rentalInfo: cleanRentalInfo(item.rentalInfo),
      deposit: item.deposit,
    }));
  },

  hasItems() {
    const items = this.getCartItemsForSync();
    return items.length > 0;
  },
};
