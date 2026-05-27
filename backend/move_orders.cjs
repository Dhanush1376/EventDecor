const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const featuresOrdersDir = path.join(srcDir, 'features', 'orders');
const servicesOrdersDir = path.join(featuresOrdersDir, 'services');

const fileMoves = [
  {
    from: path.join(srcDir, 'controllers', 'orderController.ts'),
    to: path.join(featuresOrdersDir, 'orderController.ts'),
    depthChange: 1, // Moving from depth 2 (src/controllers) to depth 3 (src/features/orders)
  },
  {
    from: path.join(srcDir, 'routes', 'orderRoutes.ts'),
    to: path.join(featuresOrdersDir, 'orderRoutes.ts'),
    depthChange: 1,
  },
  {
    from: path.join(srcDir, 'services', 'order', 'orderCreationService.ts'),
    to: path.join(servicesOrdersDir, 'orderCreationService.ts'),
    depthChange: 1, // src/services/order -> src/features/orders/services
  },
  {
    from: path.join(srcDir, 'services', 'order', 'orderPaymentService.ts'),
    to: path.join(servicesOrdersDir, 'orderPaymentService.ts'),
    depthChange: 1,
  },
  {
    from: path.join(srcDir, 'services', 'order', 'orderFulfillmentService.ts'),
    to: path.join(servicesOrdersDir, 'orderFulfillmentService.ts'),
    depthChange: 1,
  },
  {
    from: path.join(srcDir, 'services', 'orderService.ts'),
    to: path.join(featuresOrdersDir, 'orderService.ts'),
    depthChange: 1, // src/services -> src/features/orders
  }
];

function patchImports(content, depthChange, isService) {
  return content.replace(/(from\s+['"]|import\s+['"]|require\(['"])(\.\.\/)/g, (match, p1, p2) => {
    let newPath = p2;
    for (let i = 0; i < depthChange; i++) {
      newPath = '../' + newPath;
    }
    return p1 + newPath;
  });
}

for (const move of fileMoves) {
  if (fs.existsSync(move.from)) {
    let content = fs.readFileSync(move.from, 'utf8');
    
    // Patch imports
    content = patchImports(content, move.depthChange, false);
    
    // Special case for orderController.ts importing orderService
    if (move.from.includes('orderController.ts')) {
      content = content.replace(/import \{.*?\} from '..\/..\/services\/orderService';/g, "import { OrderService } from './orderService';");
      content = content.replace(/import OrderService from '..\/..\/services\/orderService';/g, "import OrderService from './orderService';");
      content = content.replace(/..\/..\/services\/orderService/g, "./orderService");
    }
    
    // Special case for orderRoutes.ts importing orderController
    if (move.from.includes('orderRoutes.ts')) {
      content = content.replace(/..\/..\/controllers\/orderController/g, "./orderController");
      content = content.replace(/..\/..\/middleware\/authMiddleware/g, "../../middleware/authMiddleware");
      content = content.replace(/..\/..\/middleware\/rateLimiter/g, "../../middleware/rateLimiter");
      content = content.replace(/..\/..\/middleware\/noCacheMiddleware/g, "../../middleware/noCacheMiddleware");
    }

    // Special case for orderService.ts importing the decomposed services
    if (move.from.includes('orderService.ts')) {
      content = content.replace(/from '\.\.\/order'/g, "from './services'");
      content = content.replace(/from '\.\/order'/g, "from './services'");
    }

    fs.writeFileSync(move.to, content);
    console.log("Moved and patched " + path.basename(move.from));
    fs.unlinkSync(move.from);
  } else {
    console.warn("Source file not found: " + move.from);
  }
}

try {
  fs.rmdirSync(path.join(srcDir, 'services', 'order'));
  console.log('Removed old src/services/order directory');
} catch (e) {}
