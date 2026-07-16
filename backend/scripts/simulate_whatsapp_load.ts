import '../src/config/loadEnv'; // Ensures all environment variables load properly
import mongoose from 'mongoose';
import { randomUUID as uuidv4 } from 'crypto';
import { WhatsAppAutomationEngine } from '../src/domains/notifications/whatsapp/WhatsAppAutomationEngine';
import WhatsAppMessageLog from '../src/models/WhatsAppMessageLog';
import WhatsAppAutomation from '../src/models/WhatsAppAutomation';
import WhatsAppRecipient from '../src/models/WhatsAppRecipient';
import WhatsAppTemplate from '../src/models/WhatsAppTemplate';
import logger from '../src/config/logger';
import '../src/jobs/whatsappWorkers'; // Import to start BullMQ workers in this process
import { initQueues } from '../src/jobs/queues';

const BATCH_SIZE = 100; // Total simulated events
const CONCURRENCY = 10; // How many to fire per loop tick

async function runLoadTest() {
  logger.info(`Starting WhatsApp Load Test - Simulating ${BATCH_SIZE} events...`);

  // 1. Connect DB & Init Queues
  await mongoose.connect(process.env.MONGO_URI as string);
  await initQueues();
  logger.info('Connected to MongoDB and initialized Queues');

  // 2. Ensure we have an active automation to test
  // For safety, we will create a temporary disabled automation just for this test
  // Or we can find an existing one. We will create a test one.

  let testRecipient = await WhatsAppRecipient.findOne({ phone: '919876543210' });
  if (!testRecipient) {
    logger.info('Creating temporary test recipient...');
    testRecipient = await WhatsAppRecipient.create({
      name: 'Load Test Admin',
      phone: '919876543210',
      role: 'owner',
      isActive: true,
    });
  }

  let testTemplate = await WhatsAppTemplate.findOne({ metaTemplateName: 'load_test_template' });
  if (!testTemplate) {
    testTemplate = await WhatsAppTemplate.create({
      metaTemplateName: 'load_test_template',
      name: 'Load Test Template',
      automationKey: 'load_test_automation',
      bodyTemplate: 'Load test message {{1}}',
      metaTemplateLanguage: 'en',
      templateCategory: 'utility',
    });
  }

  let testAutomation = await WhatsAppAutomation.findOne({ automationKey: 'load_test_automation' });
  if (!testAutomation) {
    logger.info('Creating temporary test automation...');
    testAutomation = await WhatsAppAutomation.create({
      automationKey: 'load_test_automation',
      displayName: 'Load Test Automation',
      category: 'system',
      enabled: true,
      recipientRoles: [{ role: 'owner', recipientId: testRecipient._id, enabled: true }],
      activeTemplateId: testTemplate._id,
      description: 'Used for system load testing',
    });
  } else {
    testAutomation.enabled = true;
    if (
      !testAutomation.recipientRoles.some(
        (r) => r.recipientId?.toString() === testRecipient?._id.toString(),
      )
    ) {
      testAutomation.recipientRoles = [{ recipientId: testRecipient._id as any, enabled: true }];
    }
    if (testAutomation.activeTemplateId?.toString() !== testTemplate?._id.toString()) {
      testAutomation.activeTemplateId = testTemplate._id as any;
    }
    await testAutomation.save();
  }

  logger.info('Test Automation Ready. Firing events...');

  const startTime = Date.now();
  let fired = 0;

  // 3. Fire events rapidly
  while (fired < BATCH_SIZE) {
    const promises = [];
    for (let i = 0; i < CONCURRENCY && fired < BATCH_SIZE; i++) {
      fired++;
      const timestamp = Date.now();
      promises.push(
        WhatsAppAutomationEngine.process({
          data: {
            automationKey: 'load_test_automation',
            payload: {
              orderId: undefined,
              mockEventId: uuidv4(),
              idempotencyKey: `loadtest_${uuidv4()}`,
            },
            triggerTimestamp: timestamp,
          },
        } as any),
      );
    }
    await Promise.all(promises);
    logger.info(`Fired ${fired}/${BATCH_SIZE} events...`);
  }

  const fireDuration = Date.now() - startTime;
  logger.info(`All ${BATCH_SIZE} events dispatched to BullMQ in ${fireDuration}ms`);

  // 4. Poll and monitor completion
  logger.info('Monitoring message processing via WhatsAppMessageLog...');

  let processed = 0;
  const pollInterval = setInterval(async () => {
    // We count logs created after our start time for this automation
    const logs = await WhatsAppMessageLog.find({
      automationKey: 'load_test_automation',
      triggerTimestamp: { $gte: new Date(startTime) },
    }).lean();

    processed = logs.length;

    if (processed >= BATCH_SIZE) {
      clearInterval(pollInterval);
      const processEnd = Date.now();
      const totalDuration = processEnd - startTime;

      // Calculate average timings
      let totalLatency = 0;
      let totalWorkerDelay = 0;
      let totalProviderDelay = 0;

      logs.forEach((log) => {
        totalLatency += log.latencyMs || 0;
        if (log.timings) {
          const queuedAt = log.timings.queuedAt ? new Date(log.timings.queuedAt).getTime() : NaN;
          const workerStartedAt = log.timings.workerStartedAt
            ? new Date(log.timings.workerStartedAt).getTime()
            : NaN;
          const providerCalledAt = log.timings.providerCalledAt
            ? new Date(log.timings.providerCalledAt).getTime()
            : NaN;
          const providerRespondedAt = log.timings.providerRespondedAt
            ? new Date(log.timings.providerRespondedAt).getTime()
            : NaN;

          if (!isNaN(queuedAt) && !isNaN(workerStartedAt)) {
            totalWorkerDelay += workerStartedAt - queuedAt;
          }
          if (!isNaN(providerCalledAt) && !isNaN(providerRespondedAt)) {
            totalProviderDelay += providerRespondedAt - providerCalledAt;
          }
        }
      });

      logger.info('\n=============================================');
      logger.info('         LOAD TEST COMPLETE                  ');
      logger.info('=============================================');
      logger.info(`Total Events: ${BATCH_SIZE}`);
      logger.info(`Total Wall Time: ${totalDuration}ms`);
      logger.info(`Throughput: ${((BATCH_SIZE / totalDuration) * 1000).toFixed(2)} msg/sec`);
      logger.info('\n--- Average Timings ---');
      logger.info(`Avg Total Latency: ${(totalLatency / BATCH_SIZE).toFixed(2)}ms`);
      logger.info(`Avg BullMQ Queue Delay: ${(totalWorkerDelay / BATCH_SIZE).toFixed(2)}ms`);
      logger.info(`Avg Meta API Delay: ${(totalProviderDelay / BATCH_SIZE).toFixed(2)}ms`);
      logger.info('=============================================');

      // Cleanup
      testAutomation.enabled = false;
      await testAutomation.save();
      mongoose.disconnect();
      process.exit(0);
    } else {
      logger.info(`Progress: ${processed}/${BATCH_SIZE} messages processed by workers...`);
    }
  }, 1000);
}

runLoadTest().catch((err) => {
  logger.error('Test Failed', err);
  process.exit(1);
});
