/**
 * k6 smoke load test (~50 VUs, 2 min). Target ~500 VUs for full pre-launch test.
 *
 *   k6 run -e API_URL=https://api.example.com/api -e TEST_EMAIL=user@test.com scripts/loadtest/k6-smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.API_URL || 'http://localhost:5000/api';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const products = http.get(`${BASE}/products?limit=12`);
  check(products, { 'products 200': (r) => r.status === 200 });

  sleep(1);
}
