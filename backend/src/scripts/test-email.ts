import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
import { sendEmail } from '../services/emailProvider';

async function test() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error('ADMIN_EMAIL environment variable is not set.');
      process.exit(1);
    }

    const result = await sendEmail({
      to: adminEmail,
      subject: 'Test Email',
      html: '<h1>Test</h1><p>Testing email provider...</p>',
    });
    console.log('Success:', result);
  } catch (error) {
    console.error('Failed:', error);
  }
}
test();
