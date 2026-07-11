import cron from 'node-cron';
import { WhatsAppAutomationEngine } from '../domains/notifications/whatsapp/WhatsAppAutomationEngine';
import { EscalationMonitor } from '../domains/notifications/whatsapp/EscalationMonitor';
import { WhatsAppDashboardService } from '../domains/notifications/whatsapp/WhatsAppDashboardService';
import logger from '../config/logger';

export const startWhatsAppCronJobs = () => {
  logger.info('[WhatsAppCron] Starting WhatsApp background cron jobs');

  // Daily Summary — every day at 10:00 PM IST
  cron.schedule('0 22 * * *', () => {
    WhatsAppAutomationEngine.trigger('daily_summary', {});
  });

  // Weekly Summary — every Monday at 10:00 AM IST
  cron.schedule('0 10 * * 1', () => {
    WhatsAppAutomationEngine.trigger('weekly_summary', {});
  });

  // Monthly Summary — 1st of every month at 10:00 AM IST
  cron.schedule('0 10 1 * *', () => {
    WhatsAppAutomationEngine.trigger('monthly_summary', {});
  });

  // Escalation Monitor — every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    EscalationMonitor.checkUnprocessedOrders();
  });

  // Dashboard Stats Refresh — every minute
  cron.schedule('* * * * *', () => {
    WhatsAppDashboardService.refreshCache();
  });

  // Provider Health Check — every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    WhatsAppDashboardService.checkProviderHealth();
  });
};
