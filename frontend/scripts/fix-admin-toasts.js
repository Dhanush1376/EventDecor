import fs from 'fs';
import path from 'path';

const adminDir = path.join(process.cwd(), 'src/admin/pages');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('toast.error')) return;

  let originalContent = content;
  let hasChanges = false;

  // Pattern 1: toast.error(err.response?.data?.message || "Fallback string");
  // Pattern 2: toast.error(error.response?.data?.message || 'Fallback string');
  // Replace with: toast.error(getErrorMessage(err, "Fallback string"));
  const errorObjPattern = /toast\.error\(\s*([a-zA-Z0-9_]+)(?:\??\.response\??\.data\??\.message|\?.message)?\s*\|\|\s*(['"`][^'"`]+['"`])\s*\)/g;
  content = content.replace(errorObjPattern, (match, errVar, fallbackStr) => {
    hasChanges = true;
    return `toast.error(getErrorMessage(${errVar}, ${fallbackStr}))`;
  });

  // Pattern 3: catch (err) { ... toast.error("Fallback string") }
  // This is harder with regex, let's look for toast.error("String") and replace it if we can infer the error var.
  // Actually, let's just do a global replace for the common ones that already try to extract the message.
  
  if (hasChanges && content !== originalContent) {
    // Add import if missing
    if (!content.includes('getErrorMessage')) {
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        // Calculate relative path to src/utils/errorHelpers.js
        // Admin pages are in src/admin/pages, so it's ../../utils/errorHelpers
        const importStatement = `\nimport { getErrorMessage } from '../../utils/errorHelpers';`;
        content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${path.basename(filePath)}`);
  }
}

processDirectory(adminDir);
