const fs = require('fs');
let code = fs.readFileSync('backend/src/services/visualSearchService.ts', 'utf-8');

// remove processImage
const processImageStart = code.indexOf(
  '/**\n * Compress and resize image for optimal AI processing.\n */\nexport async function processImage',
);
const processImageEnd = code.indexOf('}\n\n/**\n * Compute perceptual hash', processImageStart) + 2;
code = code.substring(0, processImageStart) + code.substring(processImageEnd);

// remove computeImageHash
const computeHashStart = code.indexOf('/**\n * Compute perceptual hash');
const computeHashEnd =
  code.indexOf('}\n\n/**\n * Calculate Hamming distance', computeHashStart) + 2;
code = code.substring(0, computeHashStart) + code.substring(computeHashEnd);

// remove hammingDistance
const hammingStart = code.indexOf('/**\n * Calculate Hamming distance');
const hammingEnd =
  code.indexOf('}\n\n// ══════════════════════════════════════════════', hammingStart) + 2;
code = code.substring(0, hammingStart) + code.substring(hammingEnd);

// remove STOP_WORDS, cleanWord, isStopWord, generateBigrams, resolveColor, computeScores
const productMatchingStart = code.indexOf('const cleanWord =');
const findMatchingStart = code.indexOf(
  '/**\n * Search for matching products, events, and showcases based on AI analysis results.\n */\nexport async function findMatchingProducts',
);
code = code.substring(0, productMatchingStart) + code.substring(findMatchingStart);

// add imports
const imports =
  "import { processImage, computeImageHash } from './visualSearch/embeddingEngine';\n" +
  "import { hammingDistance, computeProductScore, computeEventScore, computeShowcaseScore, STOP_WORDS, cleanWord, isStopWord, generateBigrams, resolveColor } from './visualSearch/similarityEngine';\n";

code = code.replace(
  "import { aiVisionCircuitBreaker } from '../utils/CircuitBreaker';",
  "import { aiVisionCircuitBreaker } from '../utils/CircuitBreaker';\n" + imports,
);

code += '\nexport { processImage, computeImageHash };\n';

fs.writeFileSync('backend/src/services/visualSearchService.ts', code);
console.log('visualSearchService cleaned up');
