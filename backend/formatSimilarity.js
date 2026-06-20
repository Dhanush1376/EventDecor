const fs = require('fs');
let code = fs.readFileSync('backend/src/services/visualSearch/similarityEngine.ts', 'utf-8');

const imports = "import { AIAnalysisResult } from '../ai/providerFactory';\n\n";
code = imports + code;

code = code.replace(/const cleanWord =/g, 'export const cleanWord =');
code = code.replace(/const STOP_WORDS =/g, 'export const STOP_WORDS =');
code = code.replace(/const isStopWord =/g, 'export const isStopWord =');
code = code.replace(/function generateBigrams/g, 'export function generateBigrams');
code = code.replace(/function resolveColor/g, 'export function resolveColor');
code = code.replace(/function computeProductScore/g, 'export function computeProductScore');
code = code.replace(/function computeEventScore/g, 'export function computeEventScore');
code = code.replace(/function computeShowcaseScore/g, 'export function computeShowcaseScore');

fs.writeFileSync('backend/src/services/visualSearch/similarityEngine.ts', code);
