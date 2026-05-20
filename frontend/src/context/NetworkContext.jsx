import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

const NetworkContext = createContext(null);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [latency, setLatency] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState(() => (navigator.onLine ? "good" : "offline"));
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Initialize queue from localStorage
  const [pendingQueue, setPendingQueue] = useState(() => {
    try {
      const stored = localStorage.getItem("siri_offline_sync_queue");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse offline queue", e);
      return [];
    }
  });

  const syncQueueRef = useRef(pendingQueue);
  useEffect(() => {
    syncQueueRef.current = pendingQueue;
    // Keep window reference synchronized for Axios interceptor
    window.__offlineQueue = pendingQueue;
  }, [pendingQueue]);

  // Keep window online status synchronized for Axios interceptor
  useEffect(() => {
    window.__isOffline = !isOnline;
  }, [isOnline]);

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

  // Detailed reachability check (ping favicon or public URL to confirm true internet)
  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setConnectionQuality("offline");
      return false;
    }

    const isLocalhost = 
      window.location.hostname === "localhost" || 
      window.location.hostname === "127.0.0.1" || 
      window.location.hostname === "[::1]";

    const startTime = performance.now();
    try {
      if (isLocalhost) {
        // Local dev: Ping external reliable servers to test actual internet connectivity
        try {
          await fetch("https://www.gstatic.com/generate_204", {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
            signal: AbortSignal.timeout(3000),
          });
          const endTime = performance.now();
          const rtt = Math.round(endTime - startTime);
          setLatency(rtt);
          setIsOnline(true);
          if (rtt > 1500 || (navigator.connection && navigator.connection.rtt > 1500)) {
            setConnectionQuality("poor");
          } else {
            setConnectionQuality("good");
          }
          return true;
        } catch (err) {
          // Fallback to Cloudflare trace if Google is blocked/unreachable
          await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
            signal: AbortSignal.timeout(3000),
          });
          const endTime = performance.now();
          const rtt = Math.round(endTime - startTime);
          setLatency(rtt);
          setIsOnline(true);
          if (rtt > 1500 || (navigator.connection && navigator.connection.rtt > 1500)) {
            setConnectionQuality("poor");
          } else {
            setConnectionQuality("good");
          }
          return true;
        }
      } else {
        // Production: Fetch a small item from our own origin to prevent CORS problems
        const response = await fetch(`${window.location.origin}/favicon.ico?t=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
          // Abort after 4 seconds to treat it as offline/extremely poor latency
          signal: AbortSignal.timeout(4000),
        });

        if (response.ok) {
          const endTime = performance.now();
          const rtt = Math.round(endTime - startTime);
          setLatency(rtt);
          
          setIsOnline(true);
          if (rtt > 2000 || (navigator.connection && navigator.connection.rtt > 2000)) {
            setConnectionQuality("poor");
          } else {
            setConnectionQuality("good");
          }
          return true;
        }
      }
    } catch (error) {
      console.warn("🌐 [Network Check] Real connectivity ping failed:", error.message);
    }

    setIsOnline(false);
    setConnectionQuality("offline");
    return false;
  }, []);

  // Background ping daemon to verify status and detect captive portals/silent drops
  useEffect(() => {
    const intervalTime = isOnline ? 20000 : 8000; // Check less frequently when online to save resources
    const timer = setInterval(() => {
      checkConnection();
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOnline, checkConnection]);

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
      localStorage.setItem("siri_offline_sync_queue", JSON.stringify(updated));
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
      localStorage.setItem("siri_offline_sync_queue", JSON.stringify(updated));
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
            console.error(`⚠️ [Offline Sync] Permanent sync rejection for ${item.description}:`, error);
            dequeueRequest(item.id);
            failedCount++;
            succeeded = true; // Break loop
          } else {
            // Server error or timeout: Wait with exponential backoff before retry
            const delay = Math.pow(2, attempts) * 1000;
            console.warn(`🔄 [Offline Sync] Sync attempt ${attempts} failed for ${item.description}. Retrying in ${delay}ms...`);
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
    const isReallyOnline = await checkConnection();
    if (isReallyOnline) {
      toast.success("Back online! Reconnecting to services...", {
        id: "network-status",
        duration: 4000,
        icon: "⚡",
      });
      // Fire synchronizer
      syncQueue();
    }
  }, [checkConnection, syncQueue]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setConnectionQuality("offline");
    toast.error("You are offline. Interactive operations will be queued.", {
      id: "network-status",
      duration: 6000,
      icon: "📡",
    });
  }, []);

  // Listen to window connectivity events
  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Run initial connectivity verification
    checkConnection();

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
        isOnline,
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
