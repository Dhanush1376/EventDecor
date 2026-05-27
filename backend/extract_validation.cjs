const fs = require('fs');
const path = require('path');

const serviceFile = path.join(__dirname, 'src', 'features', 'orders', 'orderService.ts');
let content = fs.readFileSync(serviceFile, 'utf8');

const startIdx = content.indexOf('static async validateTotals(');
if (startIdx === -1) {
  console.log('validateTotals not found');
  process.exit(0);
}

let endIdx = -1;
let braces = 0;
let inMethod = false;

for (let i = startIdx; i < content.length; i++) {
  if (content[i] === '{') {
    braces++;
    inMethod = true;
  } else if (content[i] === '}') {
    braces--;
  }

  if (inMethod && braces === 0) {
    endIdx = i;
    break;
  }
}

if (endIdx !== -1) {
  const methodBody = content.substring(startIdx, endIdx + 1);
  
  const validationCode = "import Product from '../../../models/Product';\n" +
"import User from '../../../models/User';\n" +
"import Coupon from '../../../models/Coupon';\n" +
"import ApiError from '../../../utils/ApiError';\n\n" +
"export class OrderValidationService {\n  " + methodBody + "\n}\n";

  const validationFile = path.join(__dirname, 'src', 'features', 'orders', 'services', 'orderValidation.ts');
  fs.writeFileSync(validationFile, validationCode);
  
  const newContent = content.substring(0, startIdx) + 
    'static async validateTotals(userId: string, data: any) { return OrderValidationService.validateTotals(userId, data); }\n' + 
    content.substring(endIdx + 1);
    
  const importsToAdd = "import { OrderValidationService } from './services/orderValidation';\n";
  const finalContent = importsToAdd + newContent;
  
  fs.writeFileSync(serviceFile, finalContent);
  console.log('Successfully extracted validateTotals');
}
