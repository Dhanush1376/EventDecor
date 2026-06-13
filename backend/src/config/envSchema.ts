import { z } from 'zod';

/**
 * Define the environment variable schema.
 * This provides type safety and runtime validation for configuration.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),

    // Database
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    MONGO_POOL_SIZE: z.coerce.number().int().min(1).default(20),
    SKIP_INDEX_BUILD: z.string().optional(),

    // Auth & Encryption (Supports comma-separated keys for rotation)
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    FIELD_ENCRYPTION_KEY: z.string().min(32, 'FIELD_ENCRYPTION_KEY must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().default(30),

    // Admin Defaults
    ADMIN_EMAIL: z.string().email('Invalid ADMIN_EMAIL format'),
    ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
    SUPER_ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),

    // Email
    BREVO_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM_EMAIL: z.string().email('Invalid SMTP_FROM_EMAIL format'),
    SMTP_FROM_NAME: z.string().default('Siri Arts & Crafts'),

    // Payments
    RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
    RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),

    // Media / CDN
    CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
    CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
    CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

    // URLs & Domains
    FRONTEND_URLS: z.string().min(1, 'FRONTEND_URLS is required'),
    BACKEND_URL: z.string().min(1, 'BACKEND_URL is required'),
    COOKIE_DOMAIN: z.string().optional(),

    // Infrastructure
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
    REDIS_URL: z.string().optional(),
    REQUIRE_REDIS: z.string().default('false'),
    ADMIN_ANALYTICS_CACHE_TTL: z.coerce.number().default(300),

    // APIs
    GROQ_API_KEY: z.string().optional(),
    SENTRY_DSN: z.string().optional(),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    LOG_API_SUCCESS: z.string().default('false'),
    SLOW_REQUEST_LOG_MS: z.coerce.number().default(3000),
    LOG_REDACTION: z.string().default('true'),

    // Security / Dev Flags
    TEST_RATE_LIMIT: z.string().optional(),
    BYPASS_OTP_CODE: z.string().optional(),
    SECRET_ROTATION_REMINDER: z.string().optional(),
  })
  // Production refinements
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        // Prevent default dev credentials in prod
        if (data.JWT_SECRET.includes('change_me')) return false;
        if (data.FIELD_ENCRYPTION_KEY.includes('change_me')) return false;

        // Require SRV connection in prod
        if (data.MONGO_URI.includes('localhost') || data.MONGO_URI.includes('127.0.0.1'))
          return false;

        // Razorpay webhook must be strong
        if (
          data.RAZORPAY_WEBHOOK_SECRET.length < 32 ||
          /^[a-z_]+$/i.test(data.RAZORPAY_WEBHOOK_SECRET)
        )
          return false;

        // Redis should be required in prod
        if (data.REQUIRE_REDIS === 'true' && !data.REDIS_URL) return false;

        // Dev flags must be off
        if (data.BYPASS_OTP_CODE) return false;
        if (data.SKIP_INDEX_BUILD === 'true') return false;
        if (data.TEST_RATE_LIMIT === 'true') return false;
      }
      return true;
    },
    {
      message:
        "Production security checks failed. Ensure no 'change_me' secrets, use MongoDB Atlas (no localhost), strong webhook secrets, secure Redis, and disabled dev-only flags.",
    },
  );

/**
 * Validate and export environment variables.
 * Call this early in startup.
 */
export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    process.stderr.write(
      `❌ Invalid environment variables: ${JSON.stringify(result.error.format(), null, 2)}\n`,
    );
    process.exit(1);
  }

  return result.data;
};

// Export typed env for use in the app (can replace process.env over time)
// Use partial to allow process.env.NODE_ENV fallback during initialization
export const env = process.env as Partial<z.infer<typeof envSchema>>;
