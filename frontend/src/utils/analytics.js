/**
 * Siri Arts & Crafts — Production Analytics & Tracking Module
 * 
 * Privacy-safe, consent-aware analytics with support for:
 * - Google Analytics 4
 * - Meta Pixel
 * - Custom event tracking
 * - Ecommerce tracking (GA4 enhanced ecommerce)
 * - Performance monitoring
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';

// ─── Consent Check ───
function hasAnalyticsConsent() {
  try {
    const consent = localStorage.getItem('siri_cookie_consent');
    if (!consent) return false;
    const parsed = JSON.parse(consent);
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

// ─── GA4 Initialization ───
export function initGA4() {
  if (!GA_MEASUREMENT_ID || !hasAnalyticsConsent()) return;
  if (document.querySelector(`script[src*="gtag"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We handle page views manually for SPA
    cookie_flags: 'SameSite=None;Secure',
  });
}

// ─── Meta Pixel Initialization ───
export function initMetaPixel() {
  if (!META_PIXEL_ID || !hasAnalyticsConsent()) return;
  if (window.fbq) return;

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', META_PIXEL_ID);
}

// ─── Page View Tracking ───
export function trackPageView(path, title) {
  if (!hasAnalyticsConsent()) return;

  // GA4
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
      page_location: window.location.href,
    });
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }
}

// ─── Custom Event Tracking ───
export function trackEvent(eventName, params = {}) {
  if (!hasAnalyticsConsent()) return;

  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// ─── Ecommerce Events (GA4 Enhanced Ecommerce) ───
export function trackViewItem(product) {
  trackEvent('view_item', {
    currency: 'INR',
    value: product.price,
    items: [{
      item_id: product._id || product.id,
      item_name: product.title,
      item_category: product.category,
      price: product.price,
      quantity: 1,
    }],
  });

  if (window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [product._id || product.id],
      content_name: product.title,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  }
}

export function trackAddToCart(product, quantity = 1) {
  trackEvent('add_to_cart', {
    currency: 'INR',
    value: product.price * quantity,
    items: [{
      item_id: product._id || product.id,
      item_name: product.title,
      item_category: product.category,
      price: product.price,
      quantity,
    }],
  });

  if (window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [product._id || product.id],
      content_name: product.title,
      content_type: 'product',
      value: product.price * quantity,
      currency: 'INR',
    });
  }
}

export function trackBeginCheckout(items, total) {
  trackEvent('begin_checkout', {
    currency: 'INR',
    value: total,
    items: items.map((item) => ({
      item_id: item._id || item.id,
      item_name: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  });

  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      num_items: items.length,
      value: total,
      currency: 'INR',
    });
  }
}

export function trackPurchase(orderId, items, total) {
  trackEvent('purchase', {
    transaction_id: orderId,
    currency: 'INR',
    value: total,
    items: items.map((item) => ({
      item_id: item._id || item.id,
      item_name: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  });

  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      content_ids: items.map((i) => i._id || i.id),
      value: total,
      currency: 'INR',
      num_items: items.length,
    });
  }
}

export function trackSearch(searchTerm) {
  trackEvent('search', { search_term: searchTerm });
}

// ─── Performance Monitoring ───
export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  // Use PerformanceObserver for Core Web Vitals
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackEvent('web_vitals', {
          metric_name: entry.name,
          metric_value: Math.round(entry.startTime),
          metric_rating: entry.duration < 2500 ? 'good' : entry.duration < 4000 ? 'needs-improvement' : 'poor',
        });
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    observer.observe({ type: 'first-input', buffered: true });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

// ─── Initialize All Analytics ───
export function initAnalytics() {
  initGA4();
  initMetaPixel();
  reportWebVitals();
}
