import { useState, useEffect } from 'react';
import { cmsService } from '../services/domainServices';
import { emptyWebsiteContent } from '../constants/emptyWebsiteContent';
import { initialWebsiteContent } from '../admin/data/websiteContentData';
import { invalidateApiCache } from '../utils/apiCache';
import { isPrerendering } from '../utils/prerender';

import logger from '../utils/logger';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — stale-while-revalidate in background
const STALE_REFRESH_MS = 60 * 1000; // revalidate at most once per minute when stale
const LOCAL_STORAGE_KEY = 'siri_arts_website_content';

// Global shared state for singleton caching and request de-duplication
let globalCache = null;
let lastFetchedTime = 0;
let globalPromise = null;
const listeners = new Set();

// Try to initialize globalCache synchronously from localStorage or fallback to initialWebsiteContent
try {
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    globalCache = JSON.parse(cached);
  }
} catch (e) {
  logger.warn('Failed to load cached website content from localStorage', e);
}

// Start with empty cache if not found, to trigger skeletons
// initialWebsiteContent will only be used if API explicitly fails

const updateGlobalCache = (newContent) => {
  globalCache = newContent;
  listeners.forEach((listener) => listener(newContent));
};

export const refreshWebsiteContent = async () => {
  lastFetchedTime = 0;
  globalPromise = null;
  invalidateApiCache('/cms');

  try {
    const response = await cmsService.getPublished();
    lastFetchedTime = Date.now();
    if (response.success && response.data && Object.keys(response.data).length > 0) {
      const mergedContent = { ...initialWebsiteContent, ...response.data };
      if (response.data.hero) {
        mergedContent.hero = { ...initialWebsiteContent.hero, ...response.data.hero };
      }
      if (response.data.eventsPage) {
        mergedContent.eventsPage = {
          ...initialWebsiteContent.eventsPage,
          ...response.data.eventsPage,
          hero: {
            ...initialWebsiteContent.eventsPage.hero,
            ...(response.data.eventsPage.hero || {}),
          },
          promo: {
            ...initialWebsiteContent.eventsPage.promo,
            ...(response.data.eventsPage.promo || {}),
          },
        };
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedContent));
      } catch (_e) {}
      updateGlobalCache(mergedContent);
      return mergedContent;
    }
  } catch (err) {
    logger.warn('Force CMS API refresh failed, keeping current/stale cache', err);
  }
  return null;
};

export function useWebsiteContent() {
  const isPrerender = isPrerendering();
  const [content, setContent] = useState(() => globalCache);
  const [loading, setLoading] = useState(
    isPrerender ? false : !globalCache || globalCache === emptyWebsiteContent,
  );

  useEffect(() => {
    if (isPrerender) return;
    const handleUpdate = (newContent) => {
      setContent(newContent);
      setLoading(false);
    };

    listeners.add(handleUpdate);

    const fetchContent = async (force = false) => {
      const age = Date.now() - lastFetchedTime;
      if (!force && lastFetchedTime > 0 && age < CACHE_TTL) {
        if (age >= STALE_REFRESH_MS && !globalPromise) {
          fetchContent(true);
        }
        return;
      }

      // De-duplicate concurrent in-flight requests
      if (globalPromise) {
        try {
          const res = await globalPromise;
          if (res) handleUpdate(res);
        } catch (err) {
          logger.warn('Concurrent website content fetch error:', err);
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
            if (response.data.eventsPage) {
              mergedContent.eventsPage = {
                ...initialWebsiteContent.eventsPage,
                ...response.data.eventsPage,
                hero: {
                  ...initialWebsiteContent.eventsPage.hero,
                  ...(response.data.eventsPage.hero || {}),
                },
                promo: {
                  ...initialWebsiteContent.eventsPage.promo,
                  ...(response.data.eventsPage.promo || {}),
                },
              };
            }
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedContent));
            } catch (_e) {}
            updateGlobalCache(mergedContent);
            return mergedContent;
          }
        } catch (err) {
          lastFetchedTime = Date.now(); // Throttles requests even on failure/network errors
          logger.warn('CMS API unavailable, using cached/default content', err);
        } finally {
          globalPromise = null;
        }
        return null;
      })();

      const res = await globalPromise;
      if (res) {
        handleUpdate(res);
      } else if (!globalCache) {
        // Fallback if API fails and cache is empty
        handleUpdate(initialWebsiteContent);
      }
    };

    fetchContent();

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return { ...(content || {}), loading, isReady: content !== null };
}
