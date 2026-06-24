import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local in backend
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// Import sendEmail from emailProvider
import { sendEmail } from '../services/emailProvider';

async function run() {
  console.log('Testing SMTP connection right now:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);

  try {
    const info = await sendEmail({
      to: 'dhanush1376@gmail.com',
      subject: 'Antigravity SMTP Test Email 2',
      html: '<h1>Testing if SMTP is still working</h1>',
    });
    console.log('SUCCESS! Email sent successfully:', info);
  } catch (err: any) {
    console.error('ERROR! SMTP send failed:');
    console.error(err);
  }
}

run().catch(console.error);
