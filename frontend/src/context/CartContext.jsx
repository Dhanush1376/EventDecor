import { createContext, useContext } from 'react';

export const CartStateContext = createContext(null);
export const CartDispatchContext = createContext(null);

// Backward compatible hook (triggers re-renders on any state change)
export function useCart() {
  const state = useContext(CartStateContext);
  const dispatch = useContext(CartDispatchContext);
  if (!state || !dispatch) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return { ...state, ...dispatch };
}

// Optimized hooks
export function useCartState() {
  const context = useContext(CartStateContext);
  if (!context) throw new Error('useCartState must be used within CartProvider');
  return context;
}

export function useCartDispatch() {
  const context = useContext(CartDispatchContext);
  if (!context) throw new Error('useCartDispatch must be used within CartProvider');
  return context;
}
