const fs = require('fs');
const file = 'c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor/frontend/src/admin/pages/AdminAddProduct.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove duplicate variable declarations
content = content.replace(/\s*const \[isAIGenerating, setIsAIGenerating\] = useState\(false\);/, '');
content = content.replace(/\s*const \[aiAnalysisResult, setAiAnalysisResult\] = useState\(null\);/, '');
content = content.replace(/\s*const \[showAIHUD, setShowAIHUD\] = useState\(false\);/, '');
content = content.replace(/\s*const \[aiChatInput, setAiChatInput\] = useState\(''\);/, '');
content = content.replace(/\s*const \[isAILearning, setIsAILearning\] = useState\(false\);/, '');
content = content.replace(/\s*const \[\_isApplyingFields, setIsApplyingFields\] = useState\(false\);/, '');
content = content.replace(/\s*const \[focusedField, setFocusedField\] = useState\(''\);/, '');
content = content.replace(/\s*\/\/ Variant input local state\s*const \[newVariant, setNewVariant\] = useState\(\{ name: '', value: '', price: '', stock: '' \}\);/, '');

fs.writeFileSync(file, content);
console.log("Removed duplicate state declarations!");
