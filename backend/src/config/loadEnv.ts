import dotenv from 'dotenv';
import validateEnv from './env';

// 1. Immediately parse environment variables
dotenv.config();

// 2. Validate all mandatory backend settings
validateEnv();
