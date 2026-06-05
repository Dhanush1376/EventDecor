/**
 * Performance Monitoring Utility
 * Tracks Core Web Vitals and specific Image Loading metrics.
 */

class PerformanceMonitor {
  constructor() {
    this.isDev = import.meta.env.DEV;
    this.metrics = {
      imageLoads: [],
      slowImages: [],
      cls: 0,
      lcp: 0,
      fcp: 0,
    };
    this.renderCounts = new Map();
  }

  init() {
    if (typeof window === 'undefined') return;

    this.observeCLS();
    this.observeLCP();
    this.observeFCP();
  }

  // Track individual image load performance
  trackImageLoad(url, loadTimeMs) {
    const entry = { url, loadTimeMs, timestamp: Date.now() };
    this.metrics.imageLoads.push(entry);

    if (loadTimeMs > 2000) {
      this.metrics.slowImages.push(entry);
      if (this.isDev) {
        console.warn(`[PerfMonitor] Slow image load detected: ${loadTimeMs}ms for ${url}`);
      }
      // Future: Send to analytics endpoint
    }
  }

  // Development utility to find unnecessary re-renders
  trackRender(componentName) {
    if (!this.isDev) return;

    const count = (this.renderCounts.get(componentName) || 0) + 1;
    this.renderCounts.set(componentName, count);

    if (count > 50) {
      console.warn(
        `[PerfMonitor] High render count detected for ${componentName}: ${count} renders`,
      );
    }
  }

  observeCLS() {
    try {
      let clsValue = 0;
      let clsEntries = [];
      let sessionValue = 0;
      let sessionEntries = [];

      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const firstSessionEntryTime = firstSessionEntry ? firstSessionEntry.startTime : 0;
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
            const lastSessionEntryTime = lastSessionEntry ? lastSessionEntry.startTime : 0;

            if (
              sessionValue &&
              entry.startTime - lastSessionEntryTime < 1000 &&
              entry.startTime - firstSessionEntryTime < 5000
            ) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              clsEntries = sessionEntries;
              this.metrics.cls = clsValue;

              if (this.isDev && clsValue > 0.1) {
                console.warn(`[PerfMonitor] High CLS detected: ${clsValue}`, clsEntries);
              }
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // Browser doesn't support PerformanceObserver
    }
  }

  observeLCP() {
    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;

        if (this.isDev) {
          console.log(`[PerfMonitor] LCP: ${Math.round(lastEntry.startTime)}ms`, lastEntry.element);
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Not supported
    }
  }

  observeFCP() {
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntriesByName('first-contentful-paint')) {
          this.metrics.fcp = entry.startTime;
          if (this.isDev) {
            console.log(`[PerfMonitor] FCP: ${Math.round(entry.startTime)}ms`);
          }
        }
      });
      observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
      // Not supported
    }
  }

  getMetricsSummary() {
    return {
      ...this.metrics,
      averageImageLoadTime: this.metrics.imageLoads.length
        ? this.metrics.imageLoads.reduce((sum, img) => sum + img.loadTimeMs, 0) /
          this.metrics.imageLoads.length
        : 0,
    };
  }
}

export const perfMonitor = new PerformanceMonitor();
