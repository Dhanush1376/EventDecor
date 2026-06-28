import request from 'supertest';
import app from '../app';
import AnalyticsEvent from '../models/AnalyticsEvent';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

describe('Analytics Events Batch Collection Integration Test', () => {
  let replset: MongoMemoryReplSet;

  beforeAll(async () => {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replset.getUri();
    await mongoose.connect(uri);
  });

  beforeEach(async () => {
    await AnalyticsEvent.deleteMany({}, { bypassDestructionGuard: true } as any);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replset) {
      await replset.stop();
    }
  });

  it('should accept bulk events and return 202 immediately', async () => {
    const payload = {
      events: [
        {
          sessionId: 'test_sess_1',
          eventType: 'page_view',
          page: '/test-page',
          timestamp: new Date().toISOString(),
        },
        {
          sessionId: 'test_sess_1',
          eventType: 'button_click',
          page: '/test-page',
          metadata: { buttonId: 'buy_now' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app).post('/api/v1/analytics/events').send(payload);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Events collected');
  });

  it('should process the event buffer and insert into DB after delay', async () => {
    const payload = {
      events: [
        {
          sessionId: 'test_sess_delay',
          eventType: 'search_bar_use',
          metadata: { searchQuery: 'red decorations' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send request
    await request(app).post('/api/v1/analytics/events').send(payload);

    // Should not be in DB immediately because of the 5-second buffer limit
    const immediateCount = await AnalyticsEvent.countDocuments({ sessionId: 'test_sess_delay' });
    expect(immediateCount).toBe(0);

    // Wait for the 5-second buffer flush interval to pass
    await new Promise((resolve) => setTimeout(resolve, 5500));

    // Should now be in DB
    const afterWaitCount = await AnalyticsEvent.countDocuments({ sessionId: 'test_sess_delay' });
    expect(afterWaitCount).toBe(1);

    const event = await AnalyticsEvent.findOne({ sessionId: 'test_sess_delay' });
    expect(event?.metadata?.searchIntent).toBeDefined(); // Assuming SearchIntelligenceService was called
  }, 10000); // 10s timeout for this test
});
