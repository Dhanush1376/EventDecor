const fs = require('fs');

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const loc = lines.length;
    
    // Count imports
    const imports = (content.match(/^import\s+/gm) || []).length;
    
    // Count exports
    const exports = (content.match(/^export\s+/gm) || []).length;
    
    // Hooks
    const useState = (content.match(/useState\(/g) || []).length;
    const useEffect = (content.match(/useEffect\(/g) || []).length;
    const useMemo = (content.match(/useMemo\(/g) || []).length;
    const useCallback = (content.match(/useCallback\(/g) || []).length;
    
    // API Calls
    const apiCalls = (content.match(/(fetch\(|axios\.|api\.)/g) || []).length;
    
    // JSX elements
    const jsxElements = (content.match(/<\w+(?=\s|>|\/)/g) || []).length;
    
    // Cyclomatic Complexity (rough estimate)
    const branches = (content.match(/(if\s*\(|for\s*\(|while\s*\(|catch\s*\(|\?\s|\&\&|\|\|)/g) || []).length;
    const cyclomaticComplexity = 1 + branches;
    
    // Nesting Depth (rough estimate by counting max consecutive { )
    let maxNesting = 0;
    let currentNesting = 0;
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '{') {
            currentNesting++;
            if (currentNesting > maxNesting) maxNesting = currentNesting;
        } else if (content[i] === '}') {
            currentNesting--;
        }
    }
    const nestingDepth = maxNesting;
    
    // Prop count (rough estimate by finding component declaration)
    const propsMatch = content.match(/(?:const|function)\s+\w+\s*=\s*(?:\(\s*\{\s*([^}]+)\s*\}\s*\)|\(([^)]*props[^)]*)\)|\(\s*([^)]+)\s*\))/);
    let propCount = 0;
    if (propsMatch) {
        const propsStr = propsMatch[1] || propsMatch[2] || propsMatch[3];
        if (propsStr) {
            propCount = propsStr.split(',').filter(p => p.trim()).length;
        }
    }

    // State count
    const stateCount = useState;
    
    // Maintainability Index (rough estimate: Halstead Volume & Cyclomatic Complexity & LOC)
    // MI = 171 - 5.2 * ln(V) - 0.23 * (G) - 16.2 * ln(LOC)
    // We'll fake a rough MI using LOC and Complexity
    const mi = Math.max(0, 171 - 5.2 * Math.log(loc * 10) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(loc));

    // Architecture Findings
    const mixedResponsibilities = apiCalls > 0 && jsxElements > 0 && loc > 300;
    const businessLogic = cyclomaticComplexity > 20 && loc > 300;
    const dataFetching = apiCalls > 0;
    const validation = (content.match(/(\.length\s*[><=]|Regex|test\(|match\()/g) || []).length > 2;
    const renderingInsideUi = jsxElements > 0;
    const stateManagementIssues = stateCount > 5 || useEffect > 3;

    return {
        loc,
        imports,
        exports,
        useState,
        useEffect,
        useMemo,
        useCallback,
        apiCalls,
        jsxElements,
        cyclomaticComplexity,
        nestingDepth,
        propCount,
        stateCount,
        mi: Math.round(mi * 100) / 100,
        mixedResponsibilities,
        businessLogic,
        dataFetching,
        validation,
        renderingInsideUi,
        stateManagementIssues
    };
}

const files = [
    "frontend/src/admin/pages/AdminAddProduct.jsx",
    "frontend/src/admin/pages/AdminContent.jsx",
    "frontend/src/components/search/IntelligentSearchOverlay.jsx",
    "frontend/src/admin/pages/AdminAddShowcase.jsx",
    "frontend/src/admin/pages/AdminInquiries.jsx",
    "frontend/src/pages/CustomOrders.jsx",
    "frontend/src/admin/pages/AdminSettings.jsx",
    "frontend/src/pages/EventBookingWizard.jsx",
    "frontend/src/pages/ProductListing.jsx",
    "frontend/src/components/cart/CartView.jsx",
    "frontend/src/components/ui/skeletons/PageSkeletons.jsx",
    "frontend/src/admin/pages/AdminOrders.jsx",
    "frontend/src/admin/components/AdminUIKit.jsx",
    "frontend/src/pages/EventCustomerDashboard.jsx",
    "frontend/src/admin/pages/AdminDashboard.jsx",
    "frontend/src/admin/pages/AdminEvents.jsx",
    "frontend/src/admin/pages/AdminCreateCoupon.jsx",
    "frontend/src/pages/EventShowcases.jsx",
    "frontend/src/checkout/CheckoutAddressStep.jsx",
    "frontend/src/pages/EventCollections.jsx",
    "frontend/src/pages/GalleryDetail.jsx",
    "frontend/src/admin/pages/AdminOrderDetail.jsx",
    "frontend/src/admin/pages/AdminVisualSearch.jsx",
    "frontend/src/admin/components/AdminCustomOrderConfig.jsx",
    "frontend/src/components/sections/ProductReviews.jsx"
];

const results = [];

for (const file of files) {
    try {
        const stats = analyzeFile(file);
        results.push({ file, ...stats });
    } catch (e) {
        console.error(`Error analyzing ${file}:`, e.message);
    }
}

// Calculate refactor complexity and effort, and rank.
// Technical debt score = (LOC / 100) + (Cyclomatic * 0.5) + (StateCount * 2) + (Nesting * 1.5)
const analyzed = results.map(r => {
    const debtScore = (r.loc / 100) + (r.cyclomaticComplexity * 0.5) + (r.stateCount * 2) + (r.nestingDepth * 1.5);
    
    // Refactoring Recommendations
    let recommendation = "";
    let targetComplexity = Math.max(10, Math.round(r.cyclomaticComplexity / 4));
    let effortHours = Math.round((r.loc / 100) * 1.5); // roughly 1.5 hours per 100 lines
    
    // generate some recommended subcomponents
    const baseName = r.file.split('/').pop().replace('.jsx', '').replace('.tsx', '');
    const newFiles = [
        `use${baseName}.js`
    ];
    if (r.dataFetching) newFiles.push(`use${baseName}Data.js`);
    if (r.validation) newFiles.push(`use${baseName}Validation.js`);
    
    if (r.jsxElements > 50) {
        newFiles.push(`${baseName}Header.jsx`);
        newFiles.push(`${baseName}Content.jsx`);
        newFiles.push(`${baseName}Footer.jsx`);
    }

    if (r.loc > 1000) {
        newFiles.push(`${baseName}Step1.jsx`);
        newFiles.push(`${baseName}Step2.jsx`);
    }

    return {
        ...r,
        debtScore,
        postRefactorComplexity: targetComplexity,
        effort: effortHours + " hours",
        recommendedSplits: newFiles
    };
});

analyzed.sort((a, b) => b.debtScore - a.debtScore);

fs.writeFileSync('analysis_results.json', JSON.stringify(analyzed, null, 2));
console.log("Analysis complete. Check analysis_results.json");
