import mongoose from 'mongoose';
import { getExecutiveSummary } from './src/controllers/system/customerIntelligenceController';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventdecor');
    const req = {} as any;
    const res = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log('STATUS:', code);
          console.log('DATA:', JSON.stringify(data, null, 2));
        },
      }),
    } as any;

    await getExecutiveSummary(req, res);
  } catch (err) {
    console.error('Uncaught exception:', err);
  } finally {
    process.exit(0);
  }
};
test();
