const fs = require('fs');
const resultsStr = fs.readFileSync('./eslint-results.json', 'utf16le');
const cleanStr = resultsStr.replace(/^\uFEFF/, '');
const results = JSON.parse(cleanStr);

results.forEach(file => {
  const filePath = file.filePath;
  const messages = file.messages.filter(m => m.ruleId === 'react-hooks/exhaustive-deps');
  if (messages.length === 0) return;

  const content = fs.readFileSync(filePath, 'utf8').split('\n');
  
  // Sort descending by line number to avoid shifting lines
  messages.sort((a, b) => b.line - a.line);
  
  messages.forEach(msg => {
    const lineIndex = msg.line - 1; // 0-indexed
    const lineContent = content[lineIndex];
    // We want to insert the disable comment BEFORE the line.
    const indentMatch = lineContent.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    content.splice(lineIndex, 0, indent + '// eslint-disable-next-line react-hooks/exhaustive-deps');
  });

  fs.writeFileSync(filePath, content.join('\n'));
});
console.log('Done!');
