import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { safeLocalStorage } from "../utils/storage";
import { isPrerendering } from "../utils/prerender";
import logger from '../utils/logger';
import { getApiRootUrl } from '../config/apiConfig';
import { NetworkContext } from "./NetworkContext";

export function NetworkProvider({ children }) {
  const [networkState, setNetworkState] = useState(() => navigator.onLine ? 'online' : 'reconnecting');
  const [latency, setLatency] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState(() => (navigator.onLine ? "good" : "offline"));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const failedPingsRef = useRef(0);
  
  // Turn off booting state after 25 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 25000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize queue from localStorage
  const [pendingQueue, setPendingQueue] = useState(() => {
    const stored = safeLocalStorage.getItem("siri_offline_sync_queue");
    return stored ? JSON.parse(stored) : [];
  });

  const syncQueueRef = useRef(pendingQueue);
  useEffect(() => {
    syncQueueRef.current = pendingQueue;
    // Keep window reference synchronized for Axios interceptor
    window.__offlineQueue = pendingQueue;
  }, [pendingQueue]);

  // Keep window online status synchronized for Axios interceptor
  useEffect(() => {
    window.__networkState = networkState;
  }, [networkState]);

  // Network Information API tracking if available
  useEffect(() => {
    if (!navigator.connection) return;

    const handleConnectionChange = () => {
      const conn = navigator.connection;
      if (!navigator.onLine) {
        setConnectionQuality("offline");
        return;
      }
      
      // Map Effective Connection Type (ECT)
      if (conn.effectiveType === "2g" || conn.effectiveType === "3g" || conn.rtt > 2000) {
        setConnectionQuality("poor");
      } else {
        setConnectionQuality("good");
      }
    };

    navigator.connection.addEventListener("change", handleConnectionChange);
    return () => {
      navigator.connection?.removeEventListener("change", handleConnectionChange);
    };
  }, []);

  // Detailed reachability check via API health endpoint
  const checkConnection = useCallback(async () => {
    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const readinessUrl = `${getApiRootUrl()}/readiness`;
      const response = await fetch(`${readinessUrl}?t=${Date.now()}`, {
        method: "GET",
        credentials: 'include',
        headers: {
          "Cache-Control": "no-cache",
          "Accept": "application/json"
        },
        signal: controller.signal,
      });

      if (response.ok) {
        const endTime = performance.now();
        const rtt = Math.round(endTime - startTime);
        setLatency(rtt);
        
        failedPingsRef.current = 0;
        setNetworkState('online');
        setIsBooting(false);
        toast.dismiss("backend-cold-start");
        
        if (rtt > 2000 || (navigator.connection && navigator.connection.rtt > 2000)) {
          setConnectionQuality("poor");
        } else {
          setConnectionQuality("good");
        }
        return true;
      }
    } catch (error) {
      logger.warn("🌐 [Network Check] API Health check failed:", error.message);
    } finally {
      clearTimeout(timeoutId);
    }

    // Ping failed. Debounce the offline state
    failedPingsRef.current += 1;
    
    setNetworkState(prev => {
      if (isBooting) {
        // Show a friendly loading toast on second failure if it's during initial boot to avoid false positives on fast local refresh
        if (failedPingsRef.current === 2) {
          toast.loading("Warming up the server. This might take a moment on cold start...", {
            id: "backend-cold-start",
            duration: 12000,
          });
        }
        return 'reconnecting';
      }

      if (failedPingsRef.current === 1 && prev === 'online') {
        return 'reconnecting';
      } else if (failedPingsRef.current >= 2) {
        setConnectionQuality("offline");
        toast.dismiss("backend-cold-start");
        return 'offline';
      }
      return prev;
    });

    return false;
  }, [isBooting]);

  // Background ping — less aggressive when stable to reduce cold-start API noise
  useEffect(() => {
    if (isPrerendering()) {
      return;
    }

    // Dynamic delay using exponential backoff:
    // Online -> 45s.
    // Offline/Reconnecting -> starts at 4s, doubles each time (4s -> 8s -> 16s -> 32s), capped at 45s
    const getIntervalTime = () => {
      if (networkState === 'online') return 45000;
      const count = failedPingsRef.current || 0;
      return Math.min(Math.pow(2, count) * 4000, 45000);
    };

    let timer;
    const scheduleNextCheck = () => {
      timer = setTimeout(async () => {
        await checkConnection();
        scheduleNextCheck();
      }, getIntervalTime());
    };

    scheduleNextCheck();

    return () => clearTimeout(timer);
  }, [networkState, checkConnection]);

  // Queue a request locally when offline
  const queueRequest = useCallback((requestData) => {
    const newQueueItem = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: requestData.url,
      method: requestData.method,
      data: requestData.data,
      headers: requestData.headers ? { ...requestData.headers } : {},
      timestamp: Date.now(),
      description: requestData.description || `${requestData.method} to ${requestData.url.split("/").pop()}`,
    };

    setPendingQueue((prev) => {
      const updated = [...prev, newQueueItem];
      safeLocalStorage.setItem("siri_offline_sync_queue", JSON.stringify(updated));
      return updated;
    });

    toast.success(`Action saved offline: ${newQueueItem.description}`, {
      icon: "💾",
      duration: 5000,
    });

    return newQueueItem;
  }, []);

  // Remove a request from the queue
  const dequeueRequest = useCallback((id) => {
    setPendingQueue((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      safeLocalStorage.setItem("siri_offline_sync_queue", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Sync background queue with exponential backoff on retry
  const syncQueue = useCallback(async () => {
    const currentQueue = syncQueueRef.current;
    if (currentQueue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const apiModule = await import("../services/api");
    const api = apiModule.default;

    toast.loading(`Synchronizing ${currentQueue.length} offline action(s)...`, {
      id: "sync-toast",
    });

    let successCount = 0;
    let failedCount = 0;

    for (const item of currentQueue) {
      let attempts = 0;
      let succeeded = false;

      while (attempts < 3 && !succeeded) {
        try {
          // Re-verify connection first
          const online = await checkConnection();
          if (!online) {
            toast.error("Sync suspended: Connection lost.", { id: "sync-toast" });
            setIsSyncing(false);
            return;
          }

          // Trigger the API request with standard client instance bypassing the offline interceptor queueing
          await api({
            url: item.url,
            method: item.method,
            data: item.data,
            headers: {
              ...item.headers,
              "x-offline-sync-id": item.id,
            },
            _bypassOfflineQueue: true,
          });

          succeeded = true;
          successCount++;
          dequeueRequest(item.id);
        } catch (error) {
          attempts++;
          const isClientError = error.response && error.response.status >= 400 && error.response.status < 500;
          
          if (isClientError) {
            // Discard client/validation errors to prevent queue blockage but notify user
            logger.error(`⚠️ [Offline Sync] Permanent sync rejection for ${item.description}:`, error);
            dequeueRequest(item.id);
            failedCount++;
            succeeded = true; // Break loop
          } else {
            // Server error or timeout: Wait with exponential backoff before retry
            const delay = Math.pow(2, attempts) * 1000;
            logger.warn(`🔄 [Offline Sync] Sync attempt ${attempts} failed for ${item.description}. Retrying in ${delay}ms...`);
            await new Promise((res) => setTimeout(res, delay));
          }
        }
      }

      if (!succeeded) {
        failedCount++;
      }
    }

    setIsSyncing(false);
    if (successCount > 0) {
      toast.success(`Successfully synchronized ${successCount} offline action(s)!`, {
        id: "sync-toast",
        duration: 5000,
        icon: "✨",
      });
    } else if (failedCount > 0) {
      toast.error(`Sync completed with ${failedCount} failure(s).`, {
        id: "sync-toast",
        duration: 4000,
      });
    } else {
      toast.dismiss("sync-toast");
    }
  }, [dequeueRequest, isSyncing, checkConnection]);

  // Synchronize when connection is restored
  const handleOnline = useCallback(async () => {
    // navigator.onLine fires, we should trigger a fast health check immediately
    const isReallyOnline = await checkConnection();
    if (isReallyOnline && syncQueueRef.current.length > 0) {
      toast.success("Back online! Reconnecting to services...", {
        id: "network-status",
        duration: 4000,
        icon: "⚡",
      });
      syncQueue();
    }
  }, [checkConnection, syncQueue]);

  const handleOffline = useCallback(() => {
    // Start pinging to confirm it's actually offline
    checkConnection();
  }, [checkConnection]);

  // Listen to window connectivity events
  useEffect(() => {
    if (isPrerendering()) {
      setNetworkState('online');
      setIsBooting(false);
      return;
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const runInitialCheck = () => checkConnection();
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(runInitialCheck, { timeout: 3000 });
    } else {
      setTimeout(runInitialCheck, 500);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline, checkConnection]);

  // Export functions to window so interceptor can push directly
  useEffect(() => {
    window.__queueRequest = queueRequest;
  }, [queueRequest]);

  return (
    <NetworkContext.Provider
      value={{
        networkState,
        isOnline: networkState === 'online', // Keep for backward compatibility
        latency,
        connectionQuality,
        pendingQueue,
        isSyncing,
        checkConnection,
        syncQueue,
        queueRequest,
        dequeueRequest,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}
