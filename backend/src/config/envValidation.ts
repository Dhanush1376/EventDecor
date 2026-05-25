/**
 * Shared environment variable validation (startup + CI).
 */

const baseRequiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'FIELD_ENCRYPTION_KEY',
  'JWT_EXPIRES_IN',
  'ADMIN_EMAIL',
];

const productionRequiredEnvVars = [
  'ADMIN_PASSWORD',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'FRONTEND_URLS',
  'RAZORPAY_WEBHOOK_SECRET',
  'REDIS_URL',
];

export const collectMissingEnvVars = (options?: { ciMode?: boolean }): string[] => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredEnvVars = isProduction
    ? [...baseRequiredEnvVars, ...productionRequiredEnvVars]
    : baseRequiredEnvVars;

  let missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (isProduction || options?.ciMode) {
    const hasBrevo = !!process.env.BREVO_API_KEY;
    const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasBrevo && !hasSmtp) {
      missingVars.push('BREVO_API_KEY (or SMTP_USER + SMTP_PASS)');
    }
  }

  const encKey = process.env.FIELD_ENCRYPTION_KEY;
  if (!encKey || encKey.length < 32) {
    missingVars.push('FIELD_ENCRYPTION_KEY (must be min 32 chars)');
  }
  if (encKey && encKey === process.env.JWT_SECRET) {
    missingVars.push('FIELD_ENCRYPTION_KEY (must be distinct from JWT_SECRET)');
  }

  if (isProduction) {
    if ((process.env.JWT_SECRET || '').length < 32) {
      missingVars.push('JWT_SECRET (min 32 characters in production)');
    }
    if (!process.env.RAZORPAY_KEY_ID) missingVars.push('RAZORPAY_KEY_ID');
    if (!process.env.RAZORPAY_KEY_SECRET) missingVars.push('RAZORPAY_KEY_SECRET');
  }

  if (!process.env.GROQ_API_KEY) {
    process.stdout.write('\x1b[33m⚠️ WARNING: GROQ_API_KEY is missing. AI auto-fill features will fail.\x1b[0m\n');
  }

  return missingVars;
};
