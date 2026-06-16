import assert from 'assert';
import fs from 'fs';
import dotenv from 'dotenv';
import { ADMIN_ROLES, getAdminEmails } from '../config/adminConfig';
import { collectMissingEnvVars } from '../config/envValidation';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

// Mirror the progressive boot logic for local test stability
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

// Mirror CI workflow env when running smoke tests locally
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ci.example.com';

assert.ok(ADMIN_ROLES.length > 0, 'ADMIN_ROLES must not be empty');
assert.ok(getAdminEmails().length > 0, 'getAdminEmails must return at least one address when ADMIN_EMAIL is set');
assert.equal(collectMissingEnvVars({ ciMode: true }).length, 0, 'CI env vars should be complete');

const err = new ApiError(400, 'test');
assert.equal(err.statusCode, 400);

logger.info('[smoke-test] Backend smoke checks passed');
