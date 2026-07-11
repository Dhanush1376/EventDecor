import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Build indexes explicitly (below), never lazily — a background index build is
// a catalog change that aborts any concurrent multi-document transaction.
mongoose.set('autoIndex', false);

/**
 * Integration test harness.
 *
 * Boots an in-memory MongoDB **replica set** (transactions require one — the
 * payment verification path opens a multi-document transaction) and wires
 * Mongoose to it. Collections are cleared between tests for isolation.
 *
 * This file is imported by each integration spec via `import './setup'` rather
 * than a global setup so the lifecycle hooks register in the spec's own suite.
 */

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri, { dbName: 'integration_test' });

  // The in-memory WiredTiger engine can hold a document's write lock slightly
  // longer than the 5ms default transaction lock timeout, producing spurious
  // "Unable to acquire IX lock within 5ms" errors right after seeding. Raise it
  // so transactions wait for the seed writes to settle (production Atlas does
  // not hit this).
  await mongoose.connection.db!.admin().command({
    setParameter: 1,
    maxTransactionLockRequestTimeoutMillis: 3000,
  });

  // Creating a collection implicitly inside a multi-document transaction fails
  // on MongoDB with "catalog changes; please retry". Pre-create every model's
  // collection up front so the payment transaction never has to. Models are
  // already registered by the time this hook runs (spec imports are resolved
  // before beforeAll executes).
  await ensureCollections();
}, 120_000);

/** Materialize a collection and build indexes for every registered model. */
export const ensureCollections = async () => {
  await Promise.all(
    Object.values(mongoose.models).map((m) => m.createCollection().catch(() => undefined)),
  );
  // Build all indexes now, outside any transaction, so no lazy build races the
  // payment transaction.
  await Promise.all(
    Object.values(mongoose.models).map((m) => m.createIndexes().catch(() => undefined)),
  );
};

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});
