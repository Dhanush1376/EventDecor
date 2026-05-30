import logger from './logger';
import { env } from './envSchema';

/**
 * Production Startup Validator
 *
 * Runs a battery of infrastructure checks at boot time and logs a
 * structured diagnostic summary. This is the **single source of truth**
 * for "is this deployment safe to take traffic?" beyond the Zod schema.
 *
 * Failures in CRITICAL checks will exit the process in production.
 * Failures in WARNING checks will log but allow startup to continue.
 */

interface CheckResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
}

export const runStartupValidation = (): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const results: CheckResult[] = [];

  // ── 1. NODE_ENV ──
  results.push({
    name: 'NODE_ENV',
    status: 'PASS',
    detail: `NODE_ENV=${process.env.NODE_ENV || 'undefined'}`,
  });

  // ── 2. Dev flags must be OFF in production ──
  if (isProd && process.env.BYPASS_OTP_CODE) {
    results.push({ name: 'BYPASS_OTP_CODE', status: 'FAIL', detail: 'BYPASS_OTP_CODE must not be set in production' });
  } else {
    results.push({ name: 'BYPASS_OTP_CODE', status: 'PASS', detail: 'Not set' });
  }

  if (isProd && process.env.TEST_RATE_LIMIT === 'true') {
    results.push({ name: 'TEST_RATE_LIMIT', status: 'WARN', detail: 'TEST_RATE_LIMIT=true in production (tighter limits active)' });
  }

  // ── 3. MongoDB URI validation ──
  const mongoUri = process.env.MONGO_URI || '';
  if (isProd && (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1'))) {
    results.push({ name: 'MONGO_URI', status: 'FAIL', detail: 'Must use Atlas SRV in production (no localhost)' });
  } else if (mongoUri.startsWith('mongodb+srv://')) {
    results.push({ name: 'MONGO_URI', status: 'PASS', detail: 'Atlas SRV connection' });
  } else {
    results.push({ name: 'MONGO_URI', status: 'WARN', detail: 'Not using SRV protocol' });
  }

  // ── 4. Redis TLS ──
  const redisUrl = process.env.REDIS_URL || '';
  if (isProd && process.env.REQUIRE_REDIS === 'true') {
    if (!redisUrl) {
      results.push({ name: 'REDIS_URL', status: 'FAIL', detail: 'REQUIRE_REDIS=true but REDIS_URL is empty' });
    } else if (!redisUrl.startsWith('rediss://')) {
      results.push({ name: 'REDIS_URL', status: 'WARN', detail: 'REDIS_URL does not use TLS (rediss://)' });
    } else {
      results.push({ name: 'REDIS_URL', status: 'PASS', detail: 'TLS connection (rediss://)' });
    }
  } else if (redisUrl) {
    results.push({ name: 'REDIS_URL', status: 'PASS', detail: `Configured (TLS: ${redisUrl.startsWith('rediss://')})` });
  } else {
    results.push({ name: 'REDIS_URL', status: 'WARN', detail: 'Not configured (memory fallback)' });
  }

  // ── 5. Razorpay key prefix ──
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
  if (isProd && razorpayKeyId.startsWith('rzp_test_')) {
    results.push({ name: 'RAZORPAY_KEY_ID', status: 'FAIL', detail: 'Using test key in production!' });
  } else if (razorpayKeyId.startsWith('rzp_live_')) {
    results.push({ name: 'RAZORPAY_KEY_ID', status: 'PASS', detail: 'Live key' });
  } else {
    results.push({ name: 'RAZORPAY_KEY_ID', status: 'WARN', detail: `Unrecognised prefix: ${razorpayKeyId.slice(0, 10)}...` });
  }

  // ── 6. Webhook secret strength ──
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (isProd && (webhookSecret.length < 32 || /^[a-z_]+$/i.test(webhookSecret))) {
    results.push({ name: 'RAZORPAY_WEBHOOK_SECRET', status: 'FAIL', detail: 'Webhook secret is too weak for production (must be ≥32 chars, cryptographically random)' });
  } else {
    results.push({ name: 'RAZORPAY_WEBHOOK_SECRET', status: 'PASS', detail: `Length: ${webhookSecret.length}` });
  }

  // ── 7. Sentry DSN ──
  if (isProd && !process.env.SENTRY_DSN) {
    results.push({ name: 'SENTRY_DSN', status: 'WARN', detail: 'Not configured — unhandled errors will not be reported' });
  } else if (process.env.SENTRY_DSN) {
    results.push({ name: 'SENTRY_DSN', status: 'PASS', detail: 'Configured' });
  }

  // ── 8. Node.js memory limits ──
  const maxOldSpace = process.execArgv.find(arg => arg.includes('--max-old-space-size'));
  const nodeOptions = process.env.NODE_OPTIONS || '';
  if (!maxOldSpace && !nodeOptions.includes('--max-old-space-size')) {
    results.push({ name: 'MEMORY_LIMIT', status: isProd ? 'WARN' : 'PASS', detail: 'No --max-old-space-size set (risk of uncontrolled OOM crashes)' });
  } else {
    results.push({ name: 'MEMORY_LIMIT', status: 'PASS', detail: maxOldSpace || nodeOptions });
  }

  // ── 9. TRUST_PROXY_HOPS ──
  const hops = Number(process.env.TRUST_PROXY_HOPS || '0');
  if (isProd && hops === 0) {
    results.push({ name: 'TRUST_PROXY_HOPS', status: 'WARN', detail: 'TRUST_PROXY_HOPS=0 in production (rate limits and IP logging may be inaccurate)' });
  } else {
    results.push({ name: 'TRUST_PROXY_HOPS', status: 'PASS', detail: `${hops} hop(s)` });
  }

  // ── Log summary ──
  const fails = results.filter(r => r.status === 'FAIL');
  const warns = results.filter(r => r.status === 'WARN');
  const passes = results.filter(r => r.status === 'PASS');

  logger.info(`[STARTUP VALIDATOR] ══════════════════════════════════════`);
  logger.info(`[STARTUP VALIDATOR] Production Readiness Check: ${passes.length} PASS | ${warns.length} WARN | ${fails.length} FAIL`);

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '🚨';
    const logFn = r.status === 'FAIL' ? logger.error.bind(logger) : r.status === 'WARN' ? logger.warn.bind(logger) : logger.info.bind(logger);
    logFn(`[STARTUP VALIDATOR] ${icon} ${r.name}: ${r.detail}`);
  }

  logger.info(`[STARTUP VALIDATOR] ══════════════════════════════════════`);

  // ── Hard-fail on CRITICAL violations in production ──
  if (isProd && fails.length > 0) {
    logger.error(`[STARTUP VALIDATOR] 🚨 ${fails.length} CRITICAL check(s) failed. Aborting startup.`);
    process.exit(1);
  }
};
