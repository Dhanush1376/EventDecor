import dotenv from 'dotenv';
import { validateEnv } from './envSchema';

// 1. Immediately parse environment variables
dotenv.config({ path: '.env.local' }); // Local overrides (ignored by git)
dotenv.config(); // Standard fallback
// 2. Validate all mandatory backend settings
validateEnv();
