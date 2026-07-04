import api from '../../services/api';
import debounce from 'lodash.debounce';

const BATCH_LIMIT = 20;
const BATCH_INTERVAL = 5000; // 5 seconds
let eventQueue = [];

/**
 * Extracts UTM parameters from URL
 */
const getUTMs = () => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmTerm: params.get('utm_term'),
    utmContent: params.get('utm_content'),
  };
};

/**
 * Determines device info
 */
const getDeviceInfo = () => {
  if (typeof navigator === 'undefined') return {};
  const ua = navigator.userAgent;
  let type = 'desktop';
  if (/mobile/i.test(ua)) type = 'mobile';
  if (/tablet/i.test(ua)) type = 'tablet';

  return {
    type,
    browser: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    networkType: navigator.connection?.effectiveType || 'unknown',
  };
};

/**
 * Gets or creates session ID
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('ci_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('ci_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Sends queued events to backend
 */
const flushEvents = async () => {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = []; // Clear queue immediately to avoid duplicates

  try {
    // We use fetch with keepalive for page unloads, or regular axios otherwise
    if (document.visibilityState === 'hidden') {
      const { getApiUrl } = await import('../../config/apiConfig');
      const url = `${getApiUrl()}/analytics/events`;
      const token = localStorage.getItem('token');

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: eventsToSend }),
        keepalive: true,
      }).catch(console.error);
    } else {
      await api.post('/analytics/events', { events: eventsToSend });
    }
  } catch (error) {
    console.error('Failed to flush analytics events', error);
    // Put them back in queue if not too big
    if (eventQueue.length < 100) {
      eventQueue = [...eventsToSend, ...eventQueue];
    }
  }
};

const debouncedFlush = debounce(flushEvents, BATCH_INTERVAL, { maxWait: 10000 });

/**
 * Public method to track an event
 */
export const trackEvent = (eventType, metadata = {}) => {
  const event = {
    sessionId: getSessionId(),
    eventType,
    page: window.location.pathname,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
    metadata: {
      ...getUTMs(),
      ...metadata,
    },
    device: getDeviceInfo(),
  };

  eventQueue.push(event);

  if (eventQueue.length >= BATCH_LIMIT) {
    flushEvents();
  } else {
    debouncedFlush();
  }
};

// Listen for page unloads to flush remaining events
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}
