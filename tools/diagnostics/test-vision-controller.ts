import fs from 'fs';
import path from 'path';

const envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    process.env[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

import { analyzeShowcaseImage } from './src/controllers/discovery/aiVisionController';
import mongoose from 'mongoose';

async function runTest() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  require('./src/models/Category');

  const req = {
    body: {
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    }
  } as any;

  const res = {
    status: function (statusCode: number) {
      console.log('Status:', statusCode);
      return this;
    },
    json: function (data: any) {
      console.log('Response JSON:', JSON.stringify(data, null, 2));
      return this;
    }
  } as any;

  const next = (err: any) => {
    console.error('Next called with error:', err);
  };

  try {
    console.log('Calling analyzeShowcaseImage...');
    await analyzeShowcaseImage(req, res, next);
    console.log('Done.');
  } catch (error) {
    console.error('Caught Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
