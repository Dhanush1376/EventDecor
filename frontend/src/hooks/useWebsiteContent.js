import { useState, useEffect } from "react";
import { cmsService } from "../services/domainServices";
import { initialWebsiteContent } from "../admin/data/websiteContentData";

const STORAGE_KEY = "siri_admin_website_content";
const CACHE_TTL = 30 * 1000; // 30 seconds cache TTL

// Global shared state for singleton caching and request de-duplication
let globalCache = null;
let lastFetchedTime = 0;
let globalPromise = null;
const listeners = new Set();

const updateGlobalCache = (newContent) => {
  globalCache = newContent;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newContent));
  listeners.forEach(listener => listener(newContent));
};

export function useWebsiteContent() {
  const [content, setContent] = useState(() => {
    if (globalCache) return globalCache;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Self-healing: discard old cached configuration containing the broken hero image or relative local paths
        if (
          parsed?.hero?.backgroundImage?.includes("hero_bg_luxury.jpg") ||
          parsed?.hero?.backgroundImage?.startsWith("/") ||
          parsed?.hero?.backgroundImage?.includes("luxury_royal_wedding.png")
        ) {
          localStorage.removeItem(STORAGE_KEY);
          return initialWebsiteContent;
        }
        globalCache = parsed;
        return parsed;
      }
    } catch {}
    return initialWebsiteContent;
  });

  const [loading, setLoading] = useState(!globalCache);

  useEffect(() => {
    const handleUpdate = (newContent) => {
      setContent(newContent);
      setLoading(false);
    };

    listeners.add(handleUpdate);

    const fetchContent = async () => {
      // Check cache freshness
      if (globalCache && (Date.now() - lastFetchedTime < CACHE_TTL)) {
        setLoading(false);
        return;
      }

      // De-duplicate concurrent in-flight requests
      if (globalPromise) {
        try {
          const res = await globalPromise;
          if (res) handleUpdate(res);
        } catch {}
        return;
      }

      globalPromise = (async () => {
        try {
          const response = await cmsService.getPublished();
          lastFetchedTime = Date.now(); // Throttles subsequent checks within the 30s CACHE_TTL window
          if (response.success && response.data && Object.keys(response.data).length > 0) {
            const mergedContent = { ...initialWebsiteContent, ...response.data };
            updateGlobalCache(mergedContent);
            return mergedContent;
          }
        } catch (err) {
          lastFetchedTime = Date.now(); // Throttles requests even on failure/network errors
          console.warn("CMS API unavailable, using cached/default content", err);
        } finally {
          globalPromise = null;
        }
        return null;
      })();

      await globalPromise;
    };

    fetchContent();

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const newContent = e.newValue
            ? JSON.parse(e.newValue)
            : initialWebsiteContent;
          updateGlobalCache(newContent);
        } catch (err) {
          console.error("Error parsing website content from local storage", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      listeners.delete(handleUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return { ...content, loading };
}
