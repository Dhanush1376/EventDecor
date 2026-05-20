import { useState, useEffect } from "react";
import { cmsService } from "../services/domainServices";
import { initialWebsiteContent } from "../admin/data/websiteContentData";

const CACHE_TTL = 30 * 1000; // 30 seconds cache TTL

// Global shared state for singleton caching and request de-duplication
let globalCache = null;
let lastFetchedTime = 0;
let globalPromise = null;
const listeners = new Set();

const updateGlobalCache = (newContent) => {
  globalCache = newContent;
  listeners.forEach(listener => listener(newContent));
};

export const refreshWebsiteContent = async () => {
  lastFetchedTime = 0;
  globalCache = null;
  globalPromise = null;
  
  try {
    const response = await cmsService.getPublished();
    lastFetchedTime = Date.now();
    if (response.success && response.data && Object.keys(response.data).length > 0) {
      const mergedContent = { ...initialWebsiteContent, ...response.data };
      if (response.data.hero) {
        mergedContent.hero = { ...initialWebsiteContent.hero, ...response.data.hero };
      }
      updateGlobalCache(mergedContent);
      return mergedContent;
    }
  } catch (err) {
    console.warn("Force CMS API refresh failed, keeping current/stale cache", err);
  }
  return null;
};

export function useWebsiteContent() {
  const [content, setContent] = useState(() => globalCache || null);

  const [loading, setLoading] = useState(!globalCache);

  useEffect(() => {
    const handleUpdate = (newContent) => {
      setContent(newContent);
      setLoading(false);
    };

    listeners.add(handleUpdate);

    const fetchContent = async () => {
      // Check cache freshness: BYPASS if lastFetchedTime is 0 (first load in page session)
      if (globalCache && lastFetchedTime > 0 && (Date.now() - lastFetchedTime < CACHE_TTL)) {
        setLoading(false);
        return;
      }

      // De-duplicate concurrent in-flight requests
      if (globalPromise) {
        try {
          const res = await globalPromise;
          if (res) handleUpdate(res);
        } catch (err) {
          console.warn("Concurrent website content fetch error:", err);
        }
        return;
      }

      globalPromise = (async () => {
        try {
          const response = await cmsService.getPublished();
          lastFetchedTime = Date.now();
          if (response.success && response.data && Object.keys(response.data).length > 0) {
            const mergedContent = { ...initialWebsiteContent, ...response.data };
            if (response.data.hero) {
              mergedContent.hero = { ...initialWebsiteContent.hero, ...response.data.hero };
            }
            updateGlobalCache(mergedContent);
            return mergedContent;
          }
        } catch (err) {
          lastFetchedTime = Date.now(); // Throttles requests even on failure/network errors
          console.warn("CMS API unavailable, using cached/default content", err);
          // Graceful degradation: use admin-defined defaults when API is unavailable
          if (!globalCache) {
            updateGlobalCache(initialWebsiteContent);
          }
        } finally {
          globalPromise = null;
        }
        return null;
      })();

      await globalPromise;
    };

    fetchContent();
    
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return { ...(content || {}), loading, isReady: content !== null };
}
