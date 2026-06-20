const fs = require('fs');
const { execSync } = require('child_process');

function fixUnusedVars(dir) {
    console.log(`Running ESLint in ${dir}...`);
    try {
        execSync('npx eslint . --format json --output-file eslint-report.json', { cwd: dir, stdio: 'ignore' });
    } catch (e) {
        // ESLint exits with 1 if there are errors/warnings
    }

    const reportPath = `${dir}/eslint-report.json`;
    if (!fs.existsSync(reportPath)) {
        console.log(`No report found in ${dir}`);
        return;
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let totalFixed = 0;

    for (const fileResult of report) {
        if (!fileResult.messages || fileResult.messages.length === 0) continue;

        const filePath = fileResult.filePath;
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // Process messages from bottom to top to avoid line/column shifting issues
        const messages = fileResult.messages
            .filter(m => m.ruleId === 'unused-imports/no-unused-vars' || m.ruleId === 'no-unused-vars')
            .sort((a, b) => {
                if (a.line !== b.line) return b.line - a.line;
                return b.column - a.column;
            });

        let fileModified = false;

        for (const msg of messages) {
            // "xyz" is defined but never used
            // "xyz" is assigned a value but never used
            const match = msg.message.match(/'([^']+)' is (?:defined|assigned a value) but never used/);
            if (match) {
                const varName = match[1];
                const lineIdx = msg.line - 1;
                const colIdx = msg.column - 1;

                // Ensure we are actually at the variable name
                const lineContent = lines[lineIdx];
                if (lineContent && lineContent.substring(colIdx, colIdx + varName.length) === varName) {
                    // Prefix with underscore
                    lines[lineIdx] = lineContent.substring(0, colIdx) + '_' + lineContent.substring(colIdx);
                    fileModified = true;
                    totalFixed++;
                }
            }
        }

        if (fileModified) {
            fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        }
    }
    
    if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);
    console.log(`Fixed ${totalFixed} unused variables in ${dir}`);
}

fixUnusedVars('./backend/src');
fixUnusedVars('./frontend/src');
