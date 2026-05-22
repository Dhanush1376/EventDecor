#!/bin/bash
# Siri Arts & Crafts Production Maintenance Script
# This script should be run periodically (e.g., via cron) to maintain the production environment.

echo "Starting Production Maintenance..."

# 1. Health Check
echo "Running Health Check..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-5000}/api/health)

if [ "$HEALTH_STATUS" -eq 200 ]; then
  echo "✅ Application Health Check Passed."
else
  echo "❌ Application Health Check Failed! Status Code: $HEALTH_STATUS"
fi

# 2. Trigger Sitemap Generation
echo "Triggering Sitemap Generation..."
curl -s -o /dev/null http://localhost:${PORT:-5000}/sitemap.xml
echo "✅ Sitemap generation triggered."

# 3. Clean up PM2 logs (if PM2 is used)
if command -v pm2 &> /dev/null; then
  echo "Flushing PM2 logs..."
  pm2 flush
  echo "✅ PM2 logs flushed."
fi

# 4. MongoDB backup reminder (Atlas PITR / continuous backup is configured in Atlas UI, not render.yaml)
echo "Backup check: confirm MongoDB Atlas continuous backup or PITR is enabled for your cluster."
if [ -n "$MONGO_URI" ] && echo "$MONGO_URI" | grep -qE 'mongodb(\+srv)?://.*mongodb\.net'; then
  echo "✅ MONGO_URI appears to be MongoDB Atlas — verify backup status in Atlas → Backup."
else
  echo "⚠️  Non-Atlas MONGO_URI detected — ensure your provider's backup RTO/RPO is documented."
fi

# 5. Restart Background Workers or Queues if necessary
# pm2 restart worker_name

echo "Production Maintenance Complete!"
