import { collectMissingEnvVars } from '../config/envValidation';

const missing = collectMissingEnvVars({ ciMode: true });

if (missing.length > 0) {
  console.error('[check-env] Missing required backend environment variables:');
  missing.forEach((v) => console.error(`  - ${v}`));
  process.exit(1);
}

console.log('[check-env] Backend environment variables OK');
