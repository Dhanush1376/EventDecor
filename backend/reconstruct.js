const fs = require('fs');
const lines = fs.readFileSync('backend/src/services/searchService.ts', 'utf-8').split('\n');

const newImports = `
import { getSearchCache, setSearchCache } from './search/searchCache';
import { analyzeQueryWithAI, AIAnalysisResult, getTransliterationsAndSynonyms, generateFuzzyVariants, predictCategories, getIntentExpansions } from './search/queryParser';
import { computeSearchScore, getMatchSource } from './search/rankingEngine';
import { escapeRegex, getMatchingProductCategory, getMatchingEventCategory, getMatchingGalleryCategory } from './search/filteringEngine';
`;

let result = [];
// 1. Keep base imports (lines 0 to 23)
result.push(...lines.slice(0, 24));

// 2. Add new DAG imports
result.push(newImports);

// 3. Add Interfaces (lines 242 to 289)
result.push(...lines.slice(242, 290));

// 4. Add Orchestrator functions (lines 675 to end)
result.push(...lines.slice(675));

let finalCode = result.join('\n');

// Clean up old imports no longer needed in the base imports
finalCode = finalCode.replace(/import \{ MemoryCache \} from '\.\.\/utils\/MemoryCache';\n/, '');
finalCode = finalCode.replace(/import redisClient from '\.\.\/utils\/redis';\n/, '');
finalCode = finalCode.replace(
  /import \{ sanitizePromptInput, validateAIResponse \} from '\.\.\/utils\/aiSanitizer';\n/,
  '',
);

fs.writeFileSync('backend/src/services/searchService.ts', finalCode);
