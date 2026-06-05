const fs = require('fs');
const path = require('path');

const filesToRefactor = [
  'src/services/orders/OrderRetryService.ts',
  'src/services/rentalService.ts',
  'src/services/rentals/RentalCheckoutService.ts',
  'src/services/orders/OrderFulfillmentService.ts',
  'src/services/orders/OrderCheckoutService.ts',
  'src/services/PaymentWebhookService.ts',
  'src/services/PaymentVerificationService.ts',
  'src/services/PaymentRefundService.ts',
  'src/services/paymentReconciliationService.ts',
  'src/services/eventBooking/EventBookingCheckoutService.ts',
  'src/jobs/PaymentReconciliationJob.ts',
  'src/controllers/eventBookingController.ts',
];

for (const relPath of filesToRefactor) {
  const absolutePath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(absolutePath)) continue;

  let content = fs.readFileSync(absolutePath, 'utf8');

  // Replace import
  content = content.replace(
    /import\s+(?:\{\s*getRazorpay\s*\}|getRazorpay)\s+from\s+['"](?:\.\.\/)+config\/razorpay['"];/g,
    "import { RazorpayGateway } from '../utils/RazorpayGateway';",
  );
  // Some might have different relative paths, let's just do a simpler regex
  content = content.replace(
    /import\s+(?:\{\s*getRazorpay\s*\}|getRazorpay)\s+from\s+['"].*?config\/razorpay['"];/g,
    "import { RazorpayGateway } from '../../utils/RazorpayGateway';",
  );

  // Replace require
  content = content.replace(
    /const\s+getRazorpay\s*=\s*require\(['"].*?config\/razorpay['"]\)(?:\.default)?;/g,
    "const { RazorpayGateway } = require('../../utils/RazorpayGateway');",
  );

  // Remove `const razorpay = getRazorpay();`
  content = content.replace(/const\s+razorpay\s*=\s*getRazorpay\(\);/g, '');

  // Replace usages: razorpay.orders.create -> RazorpayGateway.createOrder
  content = content.replace(/razorpay\.orders\.create/g, 'RazorpayGateway.createOrder');
  content = content.replace(/razorpay\.orders\.fetch/g, 'RazorpayGateway.getOrder');
  content = content.replace(/razorpay\.payments\.fetch/g, 'RazorpayGateway.getPayment');
  content = content.replace(/razorpay\.payments\.refund/g, 'RazorpayGateway.initiateRefund');

  fs.writeFileSync(absolutePath, content, 'utf8');
  console.log(`Refactored ${relPath}`);
}
