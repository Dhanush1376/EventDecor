const { execSync, spawn } = require('child_process');

const tests = [
  { name: 'Baseline (Everything On)', env: {} },
  { name: 'No Logging', env: { DISABLE_LOGGING: 'true' } },
  { name: 'No Rate Limiting', env: { DISABLE_RATE_LIMITER: 'true' } },
  { name: 'No Compression', env: { DISABLE_COMPRESSION: 'true' } },
  { name: 'No Cache', env: { DISABLE_CACHE: 'true' } },
  { name: 'No XSS', env: { DISABLE_XSS: 'true' } },
  {
    name: 'Everything Disabled',
    env: {
      DISABLE_LOGGING: 'true',
      DISABLE_RATE_LIMITER: 'true',
      DISABLE_COMPRESSION: 'true',
      DISABLE_CACHE: 'true',
      DISABLE_XSS: 'true',
    },
  },
];

async function run() {
  for (const test of tests) {
    console.log(`\n================================`);
    console.log(`Running Test: ${test.name}`);
    console.log(`================================`);

    // Set a different port so we don't conflict with ts-node dev server
    const serverEnv = { ...process.env, NODE_ENV: 'production', PORT: '5015', ...test.env };
    // Remove dev-only variables to pass production validation checks
    delete serverEnv.BYPASS_OTP_CODE;
    delete serverEnv.SKIP_INDEX_BUILD;
    delete serverEnv.TEST_RATE_LIMIT;

    const server = spawn('node', ['dist/server.js'], { env: serverEnv });
    server.stderr.on('data', (data) => console.error(`[Server Error] ${data.toString()}`));
    server.stdout.on('data', (data) => {
      console.log(`[Server Log] ${data.toString().trim()}`);
    });

    // Wait for the server to boot and report ready
    console.log('[Test Runner] Waiting for server to become ready...');
    let ready = false;
    for (let attempt = 1; attempt <= 30; attempt++) {
      try {
        const res = await fetch('http://127.0.0.1:5015/api/v1/readiness', {
          headers: { 'x-forwarded-proto': 'https' },
        });
        const body = await res.json();
        console.log(`[Test Runner] Readiness status: ${res.status}, body: ${JSON.stringify(body)}`);
        if (res.ok) {
          if (body.status === 'ready' || body.status === 'healthy') {
            ready = true;
            console.log(`[Test Runner] Server is ready after ${attempt}s`);
            break;
          }
        }
      } catch (e) {
        console.log(`[Test Runner] Fetch failed: ${e.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!ready) {
      console.error('[Test Runner] Server failed to become ready in 30 seconds.');
      try {
        server.kill('SIGKILL');
        execSync(`taskkill /F /PID ${server.pid} /T`, { stdio: 'ignore' });
      } catch (e) {}
      continue;
    }

    try {
      const out = execSync(
        `npx autocannon -c 10 -d 5 -H "x-forwarded-proto: https" http://127.0.0.1:5015/api/v1/products`,
        { encoding: 'utf-8' },
      );
      console.log(out);

      const reqMatch = out.match(
        /Req\/Sec\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+\d+\s+\|\s+([\d.]+)/,
      );
      const latMatch = out.match(
        /Latency\s+\|\s+[\d.]+\s*ms\s+\|\s+[\d.]+\s*ms\s+\|\s+[\d.]+\s*ms\s+\|\s+[\d.]+\s*ms\s+\|\s+([\d.]+)\s*ms/,
      );

      console.log(`Throughput: ${reqMatch ? reqMatch[1] : 'N/A'} Req/Sec`);
      console.log(`Latency: ${latMatch ? latMatch[1] : 'N/A'} ms`);
    } catch (err) {
      console.error(`Autocannon failed:`, err);
    }

    // Kill the server safely
    try {
      server.kill('SIGKILL');
      execSync(`taskkill /F /PID ${server.pid} /T`, { stdio: 'ignore' });
    } catch (e) {}

    // Wait for port to be fully released
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

run();
