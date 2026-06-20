const fs = require('fs');

const content = fs.readFileSync('backend/src/services/visualSearchService.ts', 'utf-8');

function extractFunc(name) {
  let startIdx = content.indexOf(name);
  if (startIdx === -1) return '';
  let searchStart = startIdx - 15;
  if (searchStart < 0) searchStart = 0;
  let exportIdx = content.lastIndexOf('export ', startIdx);
  if (exportIdx !== -1 && exportIdx >= searchStart) {
    startIdx = exportIdx;
  }
  let commentStart = startIdx;
  while (commentStart > 0) {
    if (content.substring(commentStart - 3, commentStart) === '/**') {
      commentStart -= 3;
      break;
    }
    if (content[commentStart - 1] === '\n' || content[commentStart - 1] === ' ') {
      commentStart--;
    } else {
      commentStart = startIdx;
      break;
    }
  }
  let braceCount = 0;
  let inFunction = false;
  let endIdx = startIdx;
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') {
      if (!inFunction) inFunction = true;
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  return content.substring(commentStart, endIdx);
}

const similarityCode = `import { AIAnalysisResult } from '../ai/providerFactory';

export const cleanWord = (w: string): string => w.toLowerCase().trim().replace(/s$/, '');

export const STOP_WORDS = new Set([
  'decoration',
  'decor',
  'decorative',
  'item',
  'set',
  'piece',
  'beautiful',
  'handmade',
  'indian',
  'traditional',
  'design',
  'new',
  'best',
  'premium',
  'quality',
]);

export const isStopWord = (w: string): boolean => STOP_WORDS.has(w);

${extractFunc('function generateBigrams').replace('function ', 'export function ')}

${extractFunc('function resolveColor').replace('function ', 'export function ')}

${extractFunc('function computeProductScore').replace('function ', 'export function ')}

${extractFunc('function computeEventScore').replace('function ', 'export function ')}

${extractFunc('function computeShowcaseScore').replace('function ', 'export function ')}

${extractFunc('function hammingDistance').replace('function ', 'export function ')}
`;

fs.writeFileSync('backend/src/services/visualSearch/similarityEngine.ts', similarityCode);

const embeddingCode = `import crypto from 'crypto';
import sharp from 'sharp';

${extractFunc('async function processImage')}

${extractFunc('async function computeImageHash')}
`;

fs.writeFileSync('backend/src/services/visualSearch/embeddingEngine.ts', embeddingCode);

console.log('Engines generated');
