import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger';

dotenv.config();

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

const api = axios.create({
  baseURL: 'https://api.cloudflare.com/client/v4',
  headers: {
    'Authorization': `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function runAudit() {
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    logger.error('❌ Please set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID in your .env file.');
    process.exit(1);
  }

  logger.info('🔍 Starting Cloudflare Programmatic Audit for Mobile Performance & Security...');

  try {
    // 1. Check Security Level
    const securityLevelRes = await api.get(`/zones/${CF_ZONE_ID}/settings/security_level`);
    const securityLevel = securityLevelRes.data.result.value;
    logger.info(`✅ Security Level: ${securityLevel}`);
    if (securityLevel === 'high' || securityLevel === 'under_attack') {
      logger.warn('⚠️ WARNING: Security Level is too high for mobile users. Change to "medium" to reduce false positive JS challenges.');
    }

    // 2. Check HTTP/3 (QUIC)
    const http3Res = await api.get(`/zones/${CF_ZONE_ID}/settings/http3`);
    const http3 = http3Res.data.result.value;
    logger.info(`✅ HTTP/3 Enabled: ${http3}`);
    if (http3 !== 'on') {
      logger.warn('⚠️ WARNING: HTTP/3 is off. Enable it to drastically improve mobile connection stability across cell towers.');
    }

    // 3. Check Bot Management / Bot Fight Mode
    const botRes = await api.get(`/zones/${CF_ZONE_ID}/bot_management`);
    const botMode = botRes.data.result.fight_mode || botRes.data.result.sbfm;
    logger.info(`✅ Bot Fight Mode: ${botMode ? 'Enabled' : 'Disabled'}`);

    // 4. Check SSL/TLS
    const sslRes = await api.get(`/zones/${CF_ZONE_ID}/settings/ssl`);
    const sslMode = sslRes.data.result.value;
    logger.info(`✅ SSL Mode: ${sslMode}`);
    if (sslMode !== 'strict' && sslMode !== 'full') {
      logger.warn('⚠️ WARNING: SSL is not set to Full/Strict. This can cause redirect loops on mobile Safari.');
    }

    // 5. Check WAF Rules (looking for Managed Challenge usage)
    const rulesetsRes = await api.get(`/zones/${CF_ZONE_ID}/rulesets`);
    const wafRulesets = rulesetsRes.data.result;
    logger.info(`✅ Found ${wafRulesets.length} WAF Rulesets.`);
    logger.info('💡 Ensure any custom firewall rules use "Managed Challenge" (Turnstile) instead of "JS Challenge".');

    logger.info('🎉 Audit Complete! Please adjust any flagged settings in your Cloudflare dashboard.');

  } catch (err: any) {
    logger.error(`❌ Audit Failed: ${err.response?.data?.errors?.[0]?.message || err.message}`);
    logger.info('Make sure your API token has Zone:Read and Zone Settings:Read permissions.');
  }
}

runAudit();
