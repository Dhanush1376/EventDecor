const { execSync } = require('child_process');
const fs = require('fs');

const tests = [
  { name: 'Baseline', env: {} },
  { name: 'No Cache', env: { DISABLE_CACHE: 'true' } },
  { name: 'No Logging', env: { DISABLE_LOGGING: 'true' } },
  { name: 'No Compression', env: { DISABLE_COMPRESSION: 'true' } },
  { name: 'No Rate Limiter', env: { DISABLE_RATE_LIMITER: 'true' } },
  {
    name: 'Everything Disabled',
    env: {
      DISABLE_CACHE: 'true',
      DISABLE_LOGGING: 'true',
      DISABLE_COMPRESSION: 'true',
      DISABLE_RATE_LIMITER: 'true',
    },
  },
];

console.log('Starting Load Test Matrix...');

for (const test of tests) {
  console.log(`\n================================`);
  console.log(`Running Test: ${test.name}`);
  console.log(`================================`);

  // Start server in background
  const envVars = Object.entries(test.env)
    .map(([k, v]) => `cross-env ${k}=${v}`)
    .join(' ');
  const prefix = envVars ? `${envVars} ` : '';

  const serverProcess = require('child_process').exec(
    `cross-env PORT=5001 ${prefix}node dist/server.js`,
  );

  // Wait 6 seconds for server to start
  execSync('node -e "setTimeout(() => {}, 6000)"');

  try {
    const out = execSync(
      'npx autocannon -c 100 -d 10 -p 10 http://localhost:5001/api/v1/products',
      { encoding: 'utf-8' },
    );

    // Parse output to find Req/Sec Avg and Latency Avg
    const reqMatch = out.match(
      /Req\/Sec\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+([\d.]+)/,
    );
    const latMatch = out.match(
      /Latency\s+\|\s+[\d.]+\s*ms\s+\|\s+[\d.]+\s*ms\s+\|\s+[\d.]+\s*ms\s+\|\s+[\d.]+\s*ms\s+\|\s+([\d.]+)\s*ms/,
    );

    console.log(`Throughput: ${reqMatch ? reqMatch[1] : 'N/A'} Req/Sec`);
    console.log(`Latency: ${latMatch ? latMatch[1] : 'N/A'} ms`);
  } catch (err) {
    console.log(`Error running autocannon: ${err.message}`);
  }

  // Kill server gracefully or forcefully
  try {
    execSync('taskkill /F /PID ' + serverProcess.pid + ' /T');
  } catch (e) {}

  // Wait 2 seconds before next test
  execSync('node -e "setTimeout(() => {}, 2000)"');
}

console.log('\nMatrix Complete.');
