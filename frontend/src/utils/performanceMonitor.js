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
      fid: 0,
      inp: 0,
    };
    this.renderCounts = new Map();
  }

  init() {
    if (typeof window === 'undefined') return;

    this.observeCLS();
    this.observeLCP();
    this.observeFCP();
    this.observeFID();
    this.observeINP();

    if (this.isDev) {
      setInterval(() => this.printDashboard(), 10000);
    }
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
                const attribution = clsEntries[clsEntries.length - 1]?.sources?.[0]?.node;
                console.warn(
                  `[PerfMonitor] High CLS detected: ${clsValue.toFixed(3)}`,
                  'Attribution:',
                  attribution,
                );
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

  observeFID() {
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.metrics.fid = entry.processingStart - entry.startTime;
          if (this.isDev) {
            console.log(`[PerfMonitor] FID: ${Math.round(this.metrics.fid)}ms`);
          }
        }
      });
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // Not supported
    }
  }

  observeINP() {
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const inp = entry.duration;
          if (inp > this.metrics.inp) {
            this.metrics.inp = inp;
            if (this.isDev && inp > 200) {
              console.warn(`[PerfMonitor] High INP detected: ${Math.round(inp)}ms`);
            }
          }
        }
      });
      observer.observe({ type: 'event', durationThreshold: 40, buffered: true });
    } catch (e) {
      // Not supported
    }
  }

  getImageLoadReport() {
    const loads = this.metrics.imageLoads.map((i) => i.loadTimeMs).sort((a, b) => a - b);
    if (loads.length === 0) return null;

    const p50 = loads[Math.floor(loads.length * 0.5)];
    const p95 = loads[Math.floor(loads.length * 0.95)];
    const p99 = loads[Math.floor(loads.length * 0.99)];

    return {
      count: loads.length,
      average: Math.round(loads.reduce((a, b) => a + b, 0) / loads.length),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      slowCount: this.metrics.slowImages.length,
    };
  }

  getMetricsSummary() {
    return {
      ...this.metrics,
      imageReport: this.getImageLoadReport(),
    };
  }

  printDashboard() {
    if (!this.isDev) return;
    const report = this.getImageLoadReport();
    console.groupCollapsed(
      '%c 🚀 Performance Dashboard',
      'background: #222; color: #bada55; padding: 4px; border-radius: 4px;',
    );
    console.log(`LCP: ${Math.round(this.metrics.lcp)}ms`);
    console.log(`CLS: ${this.metrics.cls.toFixed(3)}`);
    console.log(`FID: ${Math.round(this.metrics.fid)}ms`);
    console.log(`INP: ${Math.round(this.metrics.inp)}ms`);
    if (report) {
      console.log('--- Image Performance ---');
      console.table({
        Count: report.count,
        Average: report.average + 'ms',
        P50: report.p50 + 'ms',
        P95: report.p95 + 'ms',
        SlowCount: report.slowCount,
      });
    }
    console.groupEnd();
  }
}

export const perfMonitor = new PerformanceMonitor();
