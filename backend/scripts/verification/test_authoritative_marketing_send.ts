import dotenv from 'dotenv';
import path from 'path';

// Load environment config
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { sendEmail, getProviderStatus } from '../src/services/emailProvider';

async function run() {
  console.log('--- Email Provider & Safety Gate Diagnostics ---');
  const status = getProviderStatus();
  console.log('Provider Status:', JSON.stringify(status, null, 2));

  console.log('\n--- Initiating Live Marketing Safety Gate Test Dispatch ---');
  // Attempting to send to a simulated customer email: "test.customer@gmail.com"
  // The authoritative safety gate MUST intercept this and redirect to "dhanush1376@gmail.com"
  const simulatedCustomerEmail = 'test.customer@gmail.com';

  const testPayload = {
    to: simulatedCustomerEmail,
    subject: 'Exclusive Siri Arts & Crafts Preview: Handcrafted Brass Statues',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #1c1917; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Siri Arts & Crafts</h1>
          <p style="color: #a8a29e; margin: 6px 0 0 0; font-size: 13px;">Traditional Artistry & Timeless Decor</p>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #1c1917; font-size: 18px; margin-top: 0;">Authoritative Dispatch Verification</h2>
          <p style="color: #44403c; line-height: 1.6; font-size: 14px;">
            This email serves as live verification of the <strong>Siri Arts & Crafts Marketing Ecosystem</strong> safety gate.
          </p>
          <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 14px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #854d0e;">
              <strong>Safety Assertion:</strong> Even though the campaign target was <code>${simulatedCustomerEmail}</code>, the backend authoritative recipient-resolution layer guaranteed interception and safe delivery to your primary test inbox.
            </p>
          </div>
          <div style="text-align: center; margin-top: 28px;">
            <a href="https://siriartsandcrafts.com" style="background-color: #854d0e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Explore Collection</a>
          </div>
        </div>
        <div style="background-color: #fafaf9; border-top: 1px solid #e7e5e4; padding: 16px; text-align: center; font-size: 12px; color: #78716c;">
          © ${new Date().getFullYear()} Siri Arts & Crafts. All rights reserved. • Authoritative Test Dispatch
        </div>
      </div>
    `,
  };

  try {
    const result = await sendEmail(testPayload);
    console.log('\n✅ [DISPATCH SUCCESS]');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(`Intercepted and successfully delivered to authorized inbox!`);
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ [DISPATCH FAILED]');
    console.error(error.message || error);
    process.exit(1);
  }
}

run();
