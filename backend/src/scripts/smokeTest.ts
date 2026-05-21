import assert from 'assert';
import { ADMIN_ROLES, getAdminEmails } from '../config/adminConfig';
import { collectMissingEnvVars } from '../config/envValidation';
import ApiError from '../utils/ApiError';

assert.ok(ADMIN_ROLES.length > 0, 'ADMIN_ROLES must not be empty');
assert.ok(getAdminEmails().length > 0, 'getAdminEmails must return at least one address in CI');
assert.equal(collectMissingEnvVars({ ciMode: true }).length, 0, 'CI env vars should be complete');

const err = new ApiError(400, 'test');
assert.equal(err.statusCode, 400);

console.log('[smoke-test] Backend smoke checks passed');
