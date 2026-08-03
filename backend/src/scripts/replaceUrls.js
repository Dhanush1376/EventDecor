/* eslint-disable */
const fs = require('fs');
const path = require('path');

const oldUrl =
  'https://res.cloudinary.com/drxgnnzeb/image/upload/v1785778627/siri-arts-crafts/pw7uwvcmf3s1mqf7jion.png';
const newUrl =
  'https://res.cloudinary.com/drxgnnzeb/image/upload/v1785779448/siri-arts-crafts/zqqwwbsrjpb7bqcrl24l.png';

const replaceInFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(oldUrl)) {
    content = content.split(oldUrl).join(newUrl);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
};

const frontendBase = path.resolve(__dirname, '../../../../frontend/src');
const backendBase = path.resolve(__dirname, '../../');

const files = [
  path.join(frontendBase, 'hooks/useRazorpay.jsx'),
  path.join(frontendBase, 'checkout/hooks/useCheckoutFlow.js'),
  path.join(backendBase, 'services/orders/OrderCheckoutService.ts'),
  path.join(frontendBase, 'pages/MyCustomOrders.jsx'),
  path.join(frontendBase, 'components/dashboard/OrderCard.jsx'),
  path.join(frontendBase, 'components/dashboard/OrderDetail.jsx'),
  path.join(frontendBase, 'checkout/CheckoutProvider.jsx'),
  path.join(frontendBase, 'admin/hooks/useAdminOrders.js'),
  path.join(backendBase, 'templates/order-confirmation.hbs'),
  path.join(backendBase, 'templates/order-failed.hbs'),
  path.join(backendBase, 'templates/order-status.hbs'),
];

files.forEach((file) => replaceInFile(file));
