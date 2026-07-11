import './setup';
import { describe, it, expect } from 'vitest';

import { whatsappAutomationController } from '../../src/controllers/notifications/whatsappAutomationController';
import WhatsAppMessageLog from '../../src/models/WhatsAppMessageLog';

/** Minimal Express res double capturing the JSON payload. */
const makeRes = () => {
  const res: any = { statusCode: 200 };
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (p: any) => {
    res.body = p;
    return res;
  };
  return res;
};

const seedLog = (status: string, daysAgo = 0) => {
  const when = new Date();
  when.setDate(when.getDate() - daysAgo);
  return WhatsAppMessageLog.create({
    messageId: `m_${Math.random().toString(36).slice(2)}`,
    automationKey: 'order_created',
    automationName: 'Order Created',
    recipientPhone: '919876543210',
    recipientName: 'Owner',
    recipientRole: 'owner',
    renderedMessage: 'hello',
    deliveryStatus: status,
    createdAt: when,
  } as any);
};

describe('whatsappAutomationController.getAnalytics (real aggregation)', () => {
  it('returns zeroed continuous series when there is no message history', async () => {
    const res = makeRes();
    await whatsappAutomationController.getAnalytics({ query: {} } as any, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    // 7-day default window, every day present.
    expect(res.body.data.dailyTrends).toHaveLength(7);
    const totalSent = res.body.data.dailyTrends.reduce((a: number, d: any) => a + d.sent, 0);
    const totalFailed = res.body.data.dailyTrends.reduce((a: number, d: any) => a + d.failed, 0);
    expect(totalSent).toBe(0);
    expect(totalFailed).toBe(0);
    // Status distribution present and all zero — never the old hardcoded 1200/45/12.
    const statusMap = Object.fromEntries(
      res.body.data.statusDistribution.map((s: any) => [s.name, s.value]),
    );
    expect(statusMap).toEqual({ Sent: 0, Failed: 0, Pending: 0 });
  });

  it('reflects real logged messages in the trend and distribution', async () => {
    await Promise.all([
      seedLog('delivered', 0),
      seedLog('sent', 0),
      seedLog('read', 0),
      seedLog('failed', 0),
      seedLog('queued', 0),
    ]);

    const res = makeRes();
    await whatsappAutomationController.getAnalytics({ query: {} } as any, res);

    const statusMap = Object.fromEntries(
      res.body.data.statusDistribution.map((s: any) => [s.name, s.value]),
    );
    expect(statusMap.Sent).toBe(3); // delivered + sent + read
    expect(statusMap.Failed).toBe(1);
    expect(statusMap.Pending).toBe(1); // queued

    const today = res.body.data.dailyTrends[res.body.data.dailyTrends.length - 1];
    expect(today.sent).toBe(3);
    expect(today.failed).toBe(1);
  });

  it('honours the days query parameter for the window width', async () => {
    const res = makeRes();
    await whatsappAutomationController.getAnalytics({ query: { days: '30' } } as any, res);
    expect(res.body.data.dailyTrends).toHaveLength(30);
  });
});
