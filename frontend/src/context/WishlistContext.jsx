import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";

import { userService } from "../services/domainServices";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

import logger from '../utils/logger';
export const WishlistStateContext = createContext(null);
export const WishlistDispatchContext = createContext(null);

export function useWishlist() {
  const state = useContext(WishlistStateContext);
  const dispatch = useContext(WishlistDispatchContext);
  if (!state || !dispatch) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return { ...state, ...dispatch };
}

export function useWishlistState() {
  const context = useContext(WishlistStateContext);
  if (!context) throw new Error("useWishlistState must be used within a WishlistProvider");
  return context;
}

export function useWishlistDispatch() {
  const context = useContext(WishlistDispatchContext);
  if (!context) throw new Error("useWishlistDispatch must be used within a WishlistProvider");
  return context;
}
