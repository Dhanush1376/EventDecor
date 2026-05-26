import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

import { safeLocalStorage } from "../utils/storage";
import { isPrerendering } from "../utils/prerender";

import logger from '../utils/logger';
import { getApiRootUrl } from '../config/apiConfig';
export const NetworkContext = createContext(null);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};
