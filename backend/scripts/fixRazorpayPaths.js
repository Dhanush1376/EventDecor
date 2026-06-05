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

  // Compute correct relative path from current file to src/utils/RazorpayGateway
  const currentDir = path.dirname(absolutePath);
  const targetDir = path.join(__dirname, '..', 'src', 'utils');
  let relativeGatewayPath = path.relative(currentDir, targetDir).replace(/\\/g, '/');
  if (!relativeGatewayPath.startsWith('.')) relativeGatewayPath = './' + relativeGatewayPath;
  relativeGatewayPath += '/RazorpayGateway';

  // Fix up the import that was already added by the previous script run
  content = content.replace(
    /import\s+\{\s*RazorpayGateway\s*\}\s+from\s+['"].*?RazorpayGateway['"];/g,
    `import { RazorpayGateway } from '${relativeGatewayPath}';`,
  );

  content = content.replace(
    /const\s+\{\s*RazorpayGateway\s*\}\s*=\s*require\(['"].*?RazorpayGateway['"]\);/g,
    `const { RazorpayGateway } = require('${relativeGatewayPath}');`,
  );

  // We missed some `razorpay` instances in the previous regex because `const razorpay = getRazorpay()` was removed,
  // but there might be other usages like `razorpay.` that we need to replace if we missed any?
  // Let's replace any `razorpay.orders.create` that might still be there just in case, but they should be gone.
  // The tsc output said: "Cannot find name 'razorpay'."
  // Ah, that means there is a usage of `razorpay`! Like `razorpay.payments.fetch` but maybe it was `razorpay.payments.refund` with some other signature?
  // Let's check `tsc` output: `src/services/orders/OrderCheckoutService.ts:375:14 error TS2304: Cannot find name 'razorpay'.`
  // Maybe `razorpay` is used to check for existence? `if (!razorpay)` ?

  fs.writeFileSync(absolutePath, content, 'utf8');
  console.log(`Fixed paths in ${relPath}`);
}
