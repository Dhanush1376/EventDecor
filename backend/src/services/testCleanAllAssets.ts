import mongoose from 'mongoose';
import { GlobalAssetCleanupService } from './GlobalAssetCleanupService';
import { LifecycleConfig } from '../config/lifecycleConfig';

/* eslint-disable no-console */

async function test() {
  LifecycleConfig.enabled = true;
  LifecycleConfig.dryRun = false;
  await mongoose.connect(
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0',
  );
  const job = await mongoose.connection.db
    ?.collection('fallbackjobs')
    .findOne({ jobName: 'clean-all-assets' });
  if (!job) {
    console.error('Job not found');
    process.exit(1);
  }
  console.log('job.data is:', JSON.stringify(job.data));
  const data = job.data;
  console.log('Passing to cleanAllAssets:', data.data || data.urls);
  try {
    await GlobalAssetCleanupService.cleanAllAssets(data.data || data.urls, data.context);
    console.log('Success!');
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
test();
