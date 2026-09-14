const fs = require('fs');
let content = fs.readFileSync('src/utils/email/transactionalEmailTemplates.ts', 'utf8');

// Match `${button(...)` and everything up to the matching closing `}`.
// Since the buttons look like:
// ${button('Track Your Order', `${getFrontendUrl()}/dashboard/orders`)}
// We can use a regex that matches ${button( followed by any characters until )}, optionally followed by newlines.
// Actually, it's safer to just replace lines that contain `${button(` entirely if they only contain that button.

const lines = content.split('\n');
const newLines = lines.filter((line) => !line.includes('${button('));

fs.writeFileSync('src/utils/email/transactionalEmailTemplates.ts', newLines.join('\n'));
console.log('Removed all button lines');
