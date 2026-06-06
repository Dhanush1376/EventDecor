const fs = require('fs');

const file = 'c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor/frontend/src/pages/CustomOrders.jsx';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

const startMarker = '<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">';
const leftBoxMarker = '{/* Left Box: Step progress navigator (Desktop Only) */}';

let startIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(startMarker) && lines[i+1].includes(leftBoxMarker)) {
    startIndex = i;
    break;
  }
}

if (startIndex === -1) {
  console.log('Start index not found!');
  process.exit(1);
}

// Now find the end of this div. We can track brace/tag nesting, or look for the exact closing tag structure.
// The end is just before:
//         {/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}
//         {activeTab === 'tracker' && (

let endIndex = -1;
for (let i = startIndex; i < lines.length; i++) {
  if (lines[i].includes('{/* ─── ACTIVE VIEW: CLIENT WORKSPACE TRACKING PORTAL ─── */}')) {
    endIndex = i - 2; // the closing div of the space-y-4 w-full is at i-1. The closing of grid-cols is around i-3.
    break;
  }
}

// Let's refine the endIndex by looking upwards from the tracker portal marker
let realEnd = -1;
for(let i = endIndex; i > startIndex; i--) {
    if(lines[i].includes('</div>')) {
        if(lines[i-1].includes('</div>')) {
             realEnd = i;
             break;
        }
    }
}

console.log('Start:', startIndex, 'End:', realEnd);

const newComponent = `            <DynamicCustomOrderWizard 
              onComplete={(order) => { 
                setActiveTab('tracker'); 
                loadWorkspaceData(); 
              }} 
              initialProductPayload={linkedProduct ? { 
                productType: linkedProduct.category,
                productTitle: linkedProduct.title 
              } : null} 
            />`;

const newLines = [
  ...lines.slice(0, startIndex),
  newComponent,
  ...lines.slice(realEnd + 1)
];

// Don't forget to add the import statement at the top
let importAdded = false;
for (let i = 0; i < newLines.length; i++) {
  if (newLines[i].includes('import { ProductSummaryCard')) {
    newLines.splice(i + 1, 0, "import { DynamicCustomOrderWizard } from '../components/ui/DynamicCustomOrderWizard';");
    importAdded = true;
    break;
  }
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Replacement successful!');
