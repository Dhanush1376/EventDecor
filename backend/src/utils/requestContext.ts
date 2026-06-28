import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  ip?: string;
  method?: string;
  url?: string;
}

// Global async store for tracing requests in parallel
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Helper to dynamically enrich the active request context mid-execution (e.g. on Auth).
 */
export const updateRequestContext = (updates: Partial<RequestContext>) => {
  const store = requestContextStorage.getStore();
  if (store) {
    Object.assign(store, updates);
  }
};
