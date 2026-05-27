const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'features', 'orders', 'orderService.ts');
let content = fs.readFileSync(file, 'utf8');

// Replace `from './somethingService'` to `from '../../services/somethingService'`
content = content.replace(/from\s+['"]\.\/(\w+Service)['"]/g, "from '../../services/$1'");

// Replace `./order` with `./services`
content = content.replace(/from\s+['"]\.\/order['"]/g, "from './services'");

fs.writeFileSync(file, content);

const appFile = path.join(__dirname, 'src', 'app.ts');
let appContent = fs.readFileSync(appFile, 'utf8');
appContent = appContent.replace(/from '\.\/controllers\/orderController'/g, "from './features/orders/orderController'");
fs.writeFileSync(appFile, appContent);

console.log('Fixed imports in orderService.ts and app.ts');
