# Troubleshooting Guide

This guide covers common issues encountered while setting up and running EventDecor locally.

## Backend Issues

### 1. `ECONNREFUSED 127.0.0.1:6379` (Redis Error)

**Symptom**: The backend server crashes immediately upon startup or throws Redis connection errors in the console.
**Cause**: Redis is not running or the backend cannot connect to it.
**Solution**:

- Ensure Redis is installed and running (`redis-server`).
- Check your `.env.local` to ensure `REDIS_URL` matches your local Redis instance (default: `redis://localhost:6379`).

### 2. `MongoServerSelectionError: connect ECONNREFUSED`

**Symptom**: Timeout or crash when connecting to the database.
**Cause**: MongoDB is not running locally.
**Solution**:

- Ensure the MongoDB service is active.
- Verify `MONGO_URI` in `.env.local`. If you are using a cloud Atlas DB, check if your IP is whitelisted.

### 3. `JWT Signature Invalid` or Users logged out constantly

**Symptom**: All API requests return `401 Unauthorized`.
**Cause**: The `JWT_SECRET` changed, invalidating all existing tokens.
**Solution**: Clear your browser cookies or local storage and log in again. Ensure `JWT_SECRET` remains stable in your `.env.local`.

## Frontend Issues

### 1. Vite `Pre-transform error: Failed to resolve import`

**Symptom**: Frontend build fails or the browser shows a blank screen with an import error in the console.
**Cause**: A file was moved or deleted, but references to it were not updated.
**Solution**:

- Check the file path mentioned in the error.
- Ensure you don't have casing mismatches (e.g., `Button.jsx` vs `button.jsx`) which might work on Mac/Windows but fail on Linux CI.

### 2. API Requests returning 404 (Not Found)

**Symptom**: Network requests to `/api/v1/...` are failing.
**Cause**: The backend is not running, or Vite's proxy is misconfigured.
**Solution**:

- Ensure the backend is running on `PORT=5000`.
- Verify `vite.config.js` has a proxy set up mapping `/api` to `http://localhost:5000`.

## Testing Issues

### 1. Tests failing with `MongoServerError: Transaction numbers are only allowed on a replica set`

**Symptom**: Integration tests dealing with transactions fail.
**Cause**: MongoDB does not support transactions on standalone instances.
**Solution**: You must run MongoDB as a Replica Set locally to run transaction tests, or use `mongodb-memory-server` in tests (which we use by default in CI).

### 2. E2E Tests Flaking

**Symptom**: Tests involving time or caching fail randomly.
**Solution**: Ensure you are using Jest's `jest.useFakeTimers()` correctly and that you are clearing Redis caches `beforeEach` in your test setup.

## Getting More Help

If you encounter an issue not listed here, please open a discussion on the GitHub repository or ask in the engineering channel.
