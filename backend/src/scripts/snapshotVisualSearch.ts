import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Import loadEnv to load the correct environment variables (MONGO_URI)
import '../config/loadEnv';

import { SearchOrchestrator } from '../services/visualSearch/SearchOrchestrator';
import { IVisualSearchConfig } from '../models/VisualSearchConfig';

// Mock Config
const mockConfig: IVisualSearchConfig = {
  enabled: true,
  provider: { name: 'groq', apiKey: 'test', endpointUrl: '' },
  searchSensitivity: 1.0,
  resultCount: 10,
  similarityThreshold: 0.3,
  analyticsEnabled: false,
} as any;

const sampleAnalyses = [
  {
    name: 'Red Velvet Decoration',
    analysis: {
      labels: ['red velvet drape', 'gold border', 'traditional stage', 'floral background'],
      category: 'Wedding Decor',
      attributes: { primaryColor: 'red', material: 'velvet', style: 'traditional' },
      confidence: 0.9,
    },
  },
  {
    name: 'Golden Brass Tray',
    analysis: {
      labels: ['golden brass tray', 'lotus shape', 'pooja items', 'kundan stones'],
      category: 'Pooja Items',
      attributes: { primaryColor: 'gold', material: 'brass', shape: 'lotus' },
      confidence: 0.95,
    },
  },
  {
    name: 'Floral Arrangement',
    analysis: {
      labels: ['pink roses', 'white lilies', 'floral centerpiece', 'glass vase'],
      category: 'Floral Arrangements',
      attributes: { primaryColor: 'pink', secondaryColor: 'white', material: 'real flowers' },
      confidence: 0.85,
    },
  },
  {
    name: 'Event Showcase Generic',
    analysis: {
      labels: ['grand entrance', 'fairy lights', 'flower arch', 'welcome board'],
      category: 'Wedding Decor',
      attributes: { style: 'royal luxury' },
      confidence: 0.88,
    },
  },
];

async function run() {
  const mongoUri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/eventdecor';
  console.log('Connecting to Mongo...', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  const results = [];

  const orchestrator = new SearchOrchestrator();

  for (const sample of sampleAnalyses) {
    console.log(`Running sample: ${sample.name}`);
    const res = await orchestrator.findMatchingProducts(sample.analysis as any, mockConfig);
    results.push({
      name: sample.name,
      bestMatch: res.bestMatch
        ? { id: res.bestMatch.id, score: res.bestMatch.similarityScore, title: res.bestMatch.title }
        : null,
      similar: res.similar.map((s) => ({ id: s.id, score: s.similarityScore, title: s.title })),
      related: res.related.map((r) => ({ id: r.id, score: r.similarityScore, title: r.title })),
    });
  }

  const outputPath = path.join(__dirname, 'visual_search_snapshot_new.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Snapshot saved to ${outputPath}`);

  await mongoose.disconnect();
}

run().catch(console.error);
