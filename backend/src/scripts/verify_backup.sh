#!/bin/bash

# ==============================================================================
# Database Backup Verification Script
# ==============================================================================
# This script tests the integrity of a MongoDB backup archive by attempting
# to restore it into a temporary, isolated local database, running basic
# health checks, and then destroying the temporary database.
#
# Usage: ./verify_backup.sh /path/to/backup/archive.tar.gz
# ==============================================================================

set -e

if [ -z "$1" ]; then
  echo "Error: Please provide the path to the backup archive."
  echo "Usage: $0 /path/to/backup.tar.gz"
  exit 1
fi

ARCHIVE_PATH="$1"
TEMP_DIR="/tmp/siri_backup_verify_$(date +%s)"
TEST_DB_NAME="siri_verify_test_$(date +%s)"

echo "[1/5] Preparing temporary environment at $TEMP_DIR..."
mkdir -p "$TEMP_DIR"

echo "[2/5] Extracting archive $ARCHIVE_PATH..."
tar -xzf "$ARCHIVE_PATH" -C "$TEMP_DIR"

# Assuming the dump creates a 'dump' directory inside the archive
DUMP_DIR=$(find "$TEMP_DIR" -type d -name "dump" | head -n 1)

if [ -z "$DUMP_DIR" ]; then
  echo "Error: Could not find 'dump' directory inside the extracted archive."
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo "[3/5] Restoring to isolated test database: $TEST_DB_NAME..."
# Note: Requires local mongod running for verification
mongorestore --nsInclude="siri_prod.*" --nsFrom="siri_prod.*" --nsTo="${TEST_DB_NAME}.*" "$DUMP_DIR"

echo "[4/5] Running integrity checks..."

# Check if Users collection exists and has documents
USER_COUNT=$(mongosh --quiet --eval "db.getSiblingDB('${TEST_DB_NAME}').users.countDocuments()" | tail -n 1)
ORDER_COUNT=$(mongosh --quiet --eval "db.getSiblingDB('${TEST_DB_NAME}').orders.countDocuments()" | tail -n 1)

echo " - Found $USER_COUNT Users"
echo " - Found $ORDER_COUNT Orders"

if [ "$USER_COUNT" -eq 0 ] || [ "$ORDER_COUNT" -eq 0 ]; then
  echo "❌ Verification Failed: Critical collections are empty."
  CLEANUP_REQUIRED=true
else
  echo "✅ Verification Passed: Data is intact and readable."
  CLEANUP_REQUIRED=true
fi

echo "[5/5] Cleaning up..."
if [ "$CLEANUP_REQUIRED" = true ]; then
  mongosh --quiet --eval "db.getSiblingDB('${TEST_DB_NAME}').dropDatabase()"
  echo " - Dropped test database."
fi

rm -rf "$TEMP_DIR"
echo " - Removed temporary files."

echo "Done."
