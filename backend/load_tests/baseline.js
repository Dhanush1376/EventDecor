const autocannon = require('autocannon');
const { writeFileSync } = require('fs');
const path = require('path');

const runLoadTest = async () => {
  console.log('Starting Baseline Autocannon Load Test (Products Listing)...');

  const instance = autocannon(
    {
      url: 'http://localhost:5000/api/products?page=1&limit=20',
      connections: 100, // Concurrent connections
      pipelining: 1, // Requests per connection
      duration: 15, // Test duration in seconds
      headers: {
        'content-type': 'application/json',
      },
    },
    (err, result) => {
      if (err) {
        console.error('Error running autocannon:', err);
        return;
      }

      const reportPath = path.join(__dirname, 'report_baseline.json');
      writeFileSync(reportPath, JSON.stringify(result, null, 2));

      console.log('=== LOAD TEST RESULTS ===');
      console.log(`Requests: ${result.requests.average} req/sec`);
      console.log(`Latency: ${result.latency.average} ms average, ${result.latency.p99} ms (p99)`);
      console.log(`Total Requests: ${result.requests.total}`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Timeouts: ${result.timeouts}`);
      console.log(`Report saved to ${reportPath}`);
    },
  );

  autocannon.track(instance, { renderProgressBar: true });
};

runLoadTest();
