import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

async function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(await getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

async function refactorFramerMotion() {
  const allFiles = await getFilesRecursively(srcDir);
  const jsFiles = allFiles.filter(f => /\.(jsx?|tsx?)$/i.test(f));

  let count = 0;
  for (const file of jsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // We want to replace `import { motion` with `import { m as motion`
    // and `import { motion,` with `import { m as motion,`
    if (content.includes("import { motion ") || content.includes("import { motion,") || content.includes("import { motion}")) {
      content = content.replace(/import\s*\{\s*motion\s*,/g, "import { m as motion,");
      content = content.replace(/import\s*\{\s*motion\s*\}/g, "import { m as motion }");
      
      // Also catch cases where it's not the first import in the destructured object
      // e.g. import { AnimatePresence, motion }
      content = content.replace(/,\s*motion\s*\}/g, ", m as motion }");
      content = content.replace(/,\s*motion\s*,/g, ", m as motion,");

      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
    }
  }

  console.log(`Refactored ${count} files to use 'm as motion'.`);
}

refactorFramerMotion();
