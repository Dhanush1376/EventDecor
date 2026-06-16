import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const localEnvPath = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

// Ensure tests use the test environment name but act like production for security rules
process.env.NODE_ENV = 'test';
