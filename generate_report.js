const fs = require('fs');

const data = JSON.parse(fs.readFileSync('analysis_results.json', 'utf8'));

let md = `# React Component Refactoring Audit\n\n`;
md += `This audit analyzes the top 25 largest and most complex React components in the frontend codebase, evaluated strictly using measurable code metrics.\n\n`;

md += `## Final Ranking: Top 10 Components Creating the Most Technical Debt\n\n`;
md += `*Ranked from worst to best based on a technical debt score factoring in LOC, Cyclomatic Complexity, State Count, and Nesting Depth.*\n\n`;

const top10 = data.slice(0, 10);
top10.forEach((item, index) => {
    md += `### ${index + 1}. \`${item.file.split('/').pop()}\`\n`;
    let reason = `Debt Score: **${item.debtScore.toFixed(2)}**. `;
    let reasonsList = [];
    if (item.loc > 1500) reasonsList.push(`Massive file size (${item.loc} lines) makes it extremely hard to maintain.`);
    else if (item.loc > 1000) reasonsList.push(`Large file size (${item.loc} lines) indicates too many responsibilities.`);
    if (item.cyclomaticComplexity > 150) reasonsList.push(`Extremely high cyclomatic complexity (${item.cyclomaticComplexity}) means there are too many conditional branches and logic paths.`);
    else if (item.cyclomaticComplexity > 100) reasonsList.push(`High cyclomatic complexity (${item.cyclomaticComplexity}) makes testing difficult.`);
    if (item.stateCount > 10) reasonsList.push(`Too much local state (${item.stateCount} \`useState\` hooks) indicates state management should be extracted.`);
    if (item.nestingDepth > 8) reasonsList.push(`Deep nesting (depth ${item.nestingDepth}) makes the code hard to read and prone to bugs.`);
    
    md += reason + reasonsList.join(' ') + `\n\n`;
});

md += `## Detailed Component Analysis (Worst to Best)\n\n`;

data.forEach((item, index) => {
    const baseName = item.file.split('/').pop();
    md += `### ${index + 1}. ${baseName}\n\n`;
    
    md += `#### Basic Metrics\n`;
    md += `- **File path**: \`${item.file}\`\n`;
    md += `- **Lines of code**: ${item.loc}\n`;
    md += `- **Number of imports**: ${item.imports}\n`;
    md += `- **Number of exports**: ${item.exports}\n`;
    md += `- **Number of \`useState\` hooks**: ${item.useState}\n`;
    md += `- **Number of \`useEffect\` hooks**: ${item.useEffect}\n`;
    md += `- **Number of \`useMemo\` hooks**: ${item.useMemo}\n`;
    md += `- **Number of \`useCallback\` hooks**: ${item.useCallback}\n`;
    md += `- **Number of API calls**: ${item.apiCalls}\n`;
    md += `- **Number of JSX elements rendered**: ${item.jsxElements}\n\n`;

    md += `#### Complexity Metrics\n`;
    md += `- **Cyclomatic complexity**: ${item.cyclomaticComplexity}\n`;
    md += `- **Maintainability index**: ${item.mi}\n`;
    md += `- **Nesting depth**: ${item.nestingDepth}\n`;
    md += `- **Prop count**: ${item.propCount}\n`;
    md += `- **State count**: ${item.stateCount}\n\n`;

    md += `#### Architecture Findings\n`;
    let findings = [];
    if (item.mixedResponsibilities) findings.push("- **Mixed responsibilities**: Component handles both data fetching and complex UI rendering.");
    if (item.businessLogic) findings.push("- **Business logic inside UI**: High cyclomatic complexity indicates heavy logic processing directly in the view layer.");
    if (item.dataFetching) findings.push("- **Data fetching inside UI**: Direct API calls found in component effects instead of using a separated service or custom hook.");
    if (item.validation) findings.push("- **Validation inside UI**: Inline validation logic (regex or length checks) detected.");
    if (item.renderingInsideUi) findings.push("- **Rendering inside UI**: UI rendering logic is present (expected).");
    if (item.stateManagementIssues) findings.push("- **State management issues**: High state count or effect count points to complex local state that should be managed via context or a reducer.");
    
    if (findings.length > 0) {
        md += findings.join('\n') + '\n\n';
    } else {
        md += `- No significant architectural violations detected.\n\n`;
    }

    md += `#### Refactoring Recommendation\n`;
    md += `Split component into:\n`;
    item.recommendedSplits.forEach(split => {
        md += `→ \`${split}\`\n`;
    });
    md += `\n**Estimate:**\n`;
    md += `- **Current complexity**: ${item.cyclomaticComplexity}\n`;
    md += `- **Post-refactor complexity**: ~${item.postRefactorComplexity}\n`;
    md += `- **Estimated effort**: ${item.effort}\n\n`;
    
    md += `---\n\n`;
});

const artifactMetadata = {
  ArtifactType: "other",
  RequestFeedback: false,
  Summary: "Detailed React Component Refactoring Audit identifying technical debt across the top 25 components."
};

fs.writeFileSync('C:\\Users\\Dhanush\\.gemini\\antigravity-ide\\brain\\650e426d-3682-4170-87a7-92d349a1b4db\\react_refactoring_audit.md', md);
fs.writeFileSync('C:\\Users\\Dhanush\\.gemini\\antigravity-ide\\brain\\650e426d-3682-4170-87a7-92d349a1b4db\\.artifact_metadata.json', JSON.stringify(artifactMetadata));
