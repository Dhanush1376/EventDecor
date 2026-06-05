/**
 * k6 Load Test Suite — EventDecor / Siri Arts & Crafts
 *
 * Run with:
 *   k6 run backend/src/__tests__/load/k6-load-test.js
 *
 * Install k6:
 *   - macOS: brew install k6
 *   - Windows: choco install k6 or winget install grafana.k6
 *   - Docker: docker run -i grafana/k6 run - < k6-load-test.js
 *
 * Stages:
 *   1. Ramp-up: 0 → 50 VUs over 30s
 *   2. Sustained: 50 VUs for 2 minutes
 *   3. Spike: 50 → 200 VUs over 30s
 *   4. Sustained peak: 200 VUs for 1 minute
 *   5. Ramp-down: 200 → 0 VUs over 30s
 *
 * Thresholds:
 *   - p(95) response time < 500ms
 *   - p(99) response time < 1500ms
 *   - Error rate < 5%
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Custom metrics
const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency');
const productLatency = new Trend('product_list_latency');
const searchLatency = new Trend('search_latency');
const authLatency = new Trend('auth_latency');

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp-up to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 users
    { duration: '30s', target: 200 }, // Spike to 200 users
    { duration: '1m', target: 200 }, // Stay at 200 users
    { duration: '30s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    errors: ['rate<0.05'],
    health_latency: ['p(95)<100'],
    product_list_latency: ['p(95)<800'],
    search_latency: ['p(95)<1000'],
  },
};

export default function () {
  // Health Check (should always be fast)
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    healthLatency.add(res.timings.duration);
    const success = check(res, {
      'health status is 200': (r) => r.status === 200,
      'health response has status ok': (r) => {
        try {
          return JSON.parse(r.body).status === 'ok';
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(0.5);

  // Product Listing (public, read-heavy)
  group('Product Listing', () => {
    const res = http.get(`${BASE_URL}/api/v1/products?page=1&limit=12`);
    productLatency.add(res.timings.duration);
    const success = check(res, {
      'products status is 200': (r) => r.status === 200,
      'products has data': (r) => {
        try {
          return JSON.parse(r.body).success === true;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(0.5);

  // Search (read-heavy, potentially expensive)
  group('Search', () => {
    const queries = ['flower', 'decoration', 'wedding', 'birthday', 'mandap'];
    const query = queries[Math.floor(Math.random() * queries.length)];
    const res = http.get(`${BASE_URL}/api/v1/search?q=${query}&page=1&limit=10`);
    searchLatency.add(res.timings.duration);
    const success = check(res, {
      'search status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
  });

  sleep(0.5);

  // Version endpoint (lightweight)
  group('Version Check', () => {
    const res = http.get(`${BASE_URL}/api/v1/version`);
    check(res, {
      'version status is 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    [`backend/src/__tests__/load/results-${now}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  // k6 built-in summary is used when this function is not defined
  // This placeholder allows k6 to use its default summary output
  return '';
}
