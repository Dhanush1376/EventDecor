/**
 * Global env bootstrap for integration tests. Referenced from vitest.config.mts
 * `setupFiles` so these are set before any application module is imported.
 * Values are throwaway test credentials — never real secrets.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'integration_test_jwt_secret_at_least_32_chars_long_xx';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_DAYS = '30';
process.env.RAZORPAY_KEY_ID = 'rzp_test_integration';
process.env.RAZORPAY_KEY_SECRET = 'integration_test_razorpay_secret_key';
process.env.RAZORPAY_WEBHOOK_SECRET = 'integration_test_webhook_secret_at_least_32ch';
process.env.DISABLE_LOGGING = 'true';
process.env.LOG_LEVEL = 'error';
