const fs = require('fs');
const path = require('path');

const filePath = 'frontend/src/pages/CustomOrders.jsx';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

const targetDir = 'frontend/src/components/customOrders';

// lines 780 to 839 are index 779 to 838
const wizardLines = lines.slice(779, 839);
const wizardJSX = wizardLines.join('\n');

const fileContent = `import React from 'react';
import { ProductSummaryCard } from '../product/ProductSummaryCard';
import DynamicCustomOrderWizard from './Wizard/DynamicCustomOrderWizard';

export function CustomOrderWizard({
  isAuthenticated,
  runProtectedAction,
  linkedProduct,
  setLinkedProduct,
  setActiveTab,
  loadWorkspaceData,
  eventIdQuery
}) {
  return (
${wizardJSX}
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'CustomOrderWizard.jsx'), fileContent);

// Replace lines 779 to 839 with the component call
const before = lines.slice(0, 779);
const after = lines.slice(840);

const componentCall = `        {activeTab === 'wizard' && (
          <CustomOrderWizard 
            isAuthenticated={isAuthenticated}
            runProtectedAction={runProtectedAction}
            linkedProduct={linkedProduct}
            setLinkedProduct={setLinkedProduct}
            setActiveTab={setActiveTab}
            loadWorkspaceData={loadWorkspaceData}
            eventIdQuery={eventIdQuery}
          />
        )}`;

let newCode = before.join('\n') + '\n' + componentCall + '\n' + after.join('\n');

const imports = `import { CustomOrderWizard } from '../components/customOrders/CustomOrderWizard';`;
newCode = newCode.replace("import DynamicCustomOrderWizard from '../components/customOrders/Wizard/DynamicCustomOrderWizard';", imports);
newCode = newCode.replace("import { ProductSummaryCard } from '../components/product/ProductSummaryCard';", "");

fs.writeFileSync(filePath, newCode);
console.log('CustomOrderWizard extracted successfully via strict line numbers.');
