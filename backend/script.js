const fs = require('fs');
let content = fs.readFileSync('backend/src/services/searchService.new.ts', 'utf-8');

const newImports = `import { getSearchCache, setSearchCache } from './search/searchCache';
import { analyzeQueryWithAI, AIAnalysisResult, getTransliterationsAndSynonyms, generateFuzzyVariants, predictCategories, getIntentExpansions } from './search/queryParser';
import { computeSearchScore, getMatchSource } from './search/rankingEngine';
import { escapeRegex, getMatchingProductCategory, getMatchingEventCategory, getMatchingGalleryCategory } from './search/filteringEngine';\n`;

content = content.replace("import { MemoryCache } from '../utils/MemoryCache';", '');
content = content.replace("import redisClient from '../utils/redis';", '');
content = content.replace(
  "import { sanitizePromptInput, validateAIResponse } from '../utils/aiSanitizer';",
  '',
);

content = newImports + content;

fs.writeFileSync('backend/src/services/searchService.new.ts', content);
