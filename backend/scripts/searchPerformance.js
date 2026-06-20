const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api/v1/search';

const queries = [
  'wedding',
  'pelli decoration',
  'wedding decor under 50k',
  'yellow flowers wedding stage',
  'traditional',
];

async function measureTime(url) {
  const start = Date.now();
  await axios.get(url);
  return Date.now() - start;
}

async function runBenchmark() {
  console.log('Running Performance Baseline...');
  const results = {
    autocomplete: [],
    fullSearch: [],
    timestamp: new Date().toISOString(),
  };

  for (const q of queries) {
    // Warmup
    try {
      await axios.get(`${API_BASE}/autocomplete?q=${encodeURIComponent(q)}&limit=5`);
      await axios.get(`${API_BASE}/results?q=${encodeURIComponent(q)}&limit=10&page=1`);
    } catch (e) {
      console.warn('API may not be running or endpoint failed');
      return;
    }

    // Measure Autocomplete
    let acTimes = [];
    for (let i = 0; i < 5; i++) {
      acTimes.push(
        await measureTime(`${API_BASE}/autocomplete?q=${encodeURIComponent(q)}&limit=5`),
      );
    }
    results.autocomplete.push(acTimes.reduce((a, b) => a + b, 0) / acTimes.length);

    // Measure Full Search
    let fullTimes = [];
    for (let i = 0; i < 5; i++) {
      fullTimes.push(
        await measureTime(`${API_BASE}/results?q=${encodeURIComponent(q)}&limit=10&page=1`),
      );
    }
    results.fullSearch.push(fullTimes.reduce((a, b) => a + b, 0) / fullTimes.length);
  }

  const avgAC = results.autocomplete.reduce((a, b) => a + b, 0) / results.autocomplete.length;
  const avgFull = results.fullSearch.reduce((a, b) => a + b, 0) / results.fullSearch.length;

  const baseline = {
    avgAutocompleteMs: Math.round(avgAC),
    avgFullSearchMs: Math.round(avgFull),
  };

  const outFile = path.join(__dirname, 'search_baseline.json');
  fs.writeFileSync(outFile, JSON.stringify(baseline, null, 2));
  console.log(`Baseline saved to ${outFile}`);
  console.log(`Autocomplete Avg: ${baseline.avgAutocompleteMs}ms`);
  console.log(`Full Search Avg: ${baseline.avgFullSearchMs}ms`);
}

runBenchmark().catch(console.error);
