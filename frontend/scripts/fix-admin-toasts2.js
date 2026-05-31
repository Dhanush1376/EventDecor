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

  // Find catch(err) { ... toast.error("String") ... }
  // Since AST parsing is safer but complex to set up without babel, let's do a slightly looser regex for remaining hardcoded toasts
  // Look for: catch (someVar) { ... toast.error("Something") ... }
  // We'll replace just toast.error("Something") with toast.error(getErrorMessage(someVar, "Something"))
  
  // This is a naive but effective way for our specific codebase style:
  const catchRegex = /catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{([\s\S]*?)\}/g;
  content = content.replace(catchRegex, (match, errVar, blockBody) => {
    // Inside the block, look for toast.error("...")
    const toastRegex = /toast\.error\(\s*(['"`][^'"`]+['"`])(?:\s*,\s*\{[^}]+\})?\s*\)/g;
    if (toastRegex.test(blockBody)) {
      const newBlockBody = blockBody.replace(toastRegex, (toastMatch, stringArg) => {
        hasChanges = true;
        // if there's a second arg like { id: toastId }, preserve it
        const optionsMatch = toastMatch.match(/,\s*(\{[^}]+\})\s*\)/);
        const options = optionsMatch ? `, ${optionsMatch[1]}` : '';
        return `toast.error(getErrorMessage(${errVar}, ${stringArg})${options})`;
      });
      return `catch (${errVar}) {${newBlockBody}}`;
    }
    return match;
  });
  
  // Also handle arrow function .catch(err => toast.error("..."))
  const promiseCatchRegex = /\.catch\(\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*=>\s*toast\.error\(\s*(['"`][^'"`]+['"`])\s*\)\s*\)/g;
  content = content.replace(promiseCatchRegex, (match, errVar, stringArg) => {
    hasChanges = true;
    return `.catch((${errVar}) => toast.error(getErrorMessage(${errVar}, ${stringArg})))`;
  });
  
  // Short syntax: .catch(err => { ... toast.error(...) })
  const promiseCatchBlockRegex = /\.catch\(\s*(?:\(\s*)?([a-zA-Z0-9_]+)(?:\s*\))?\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
  content = content.replace(promiseCatchBlockRegex, (match, errVar, blockBody) => {
    const toastRegex = /toast\.error\(\s*(['"`][^'"`]+['"`])(?:\s*,\s*\{[^}]+\})?\s*\)/g;
    if (toastRegex.test(blockBody)) {
      const newBlockBody = blockBody.replace(toastRegex, (toastMatch, stringArg) => {
        hasChanges = true;
        const optionsMatch = toastMatch.match(/,\s*(\{[^}]+\})\s*\)/);
        const options = optionsMatch ? `, ${optionsMatch[1]}` : '';
        return `toast.error(getErrorMessage(${errVar}, ${stringArg})${options})`;
      });
      return `.catch((${errVar}) => {${newBlockBody}})`;
    }
    return match;
  });

  if (hasChanges && content !== originalContent) {
    if (!content.includes('getErrorMessage')) {
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        const importStatement = `\nimport { getErrorMessage } from '../../utils/errorHelpers';`;
        content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${path.basename(filePath)}`);
  }
}

processDirectory(adminDir);
