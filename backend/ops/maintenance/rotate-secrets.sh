#!/bin/bash
# Script to assist with generating new secrets for rotation

echo "========================================================="
echo "   🔐 EventDecor Secrets Rotation Assistant 🔐"
echo "========================================================="
echo ""
echo "This script helps generate new cryptographically secure secrets."
echo "Follow the rotation steps in the implementation plan to safely"
echo "deploy these new secrets."
echo ""

# Generate new JWT Secret
NEW_JWT=$(openssl rand -hex 32)
echo "🆕 New JWT_SECRET (32 chars):"
echo "   $NEW_JWT"
echo ""

# Generate new Field Encryption Key
NEW_FIELD=$(openssl rand -hex 32)
echo "🆕 New FIELD_ENCRYPTION_KEY (32 chars):"
echo "   $NEW_FIELD"
echo ""

# Generate new Razorpay Webhook Secret
NEW_RZP=$(openssl rand -hex 32)
echo "🆕 New RAZORPAY_WEBHOOK_SECRET (32 chars):"
echo "   $NEW_RZP"
echo ""

echo "========================================================="
echo "📋 DUAL-KEY ROTATION INSTRUCTIONS (JWT_SECRET only):"
echo "1. Go to your Secrets Manager (or .env for local)"
echo "2. Find your current JWT_SECRET."
echo "3. Update it to be a comma-separated list of the new and old secret:"
echo "   JWT_SECRET=\"$NEW_JWT,<your_old_secret>\""
echo "4. Deploy the application."
echo "5. Wait 30 days (for REFRESH_TOKEN_EXPIRES_DAYS) so all active tokens expire."
echo "6. Remove <your_old_secret> from JWT_SECRET."
echo "   JWT_SECRET=\"$NEW_JWT\""
echo "7. Deploy the application again."
echo "========================================================="
