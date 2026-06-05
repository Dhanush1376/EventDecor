const autocannon = require('autocannon');
const { writeFileSync } = require('fs');
const path = require('path');

const runLoadTest = async () => {
  console.log('Starting Autocannon Load Test (Auth OTP Sending & Verification)...');

  // We test the rate limiting on the send-otp endpoint
  const instance = autocannon(
    {
      url: 'http://localhost:5000/api/v1/auth/send-otp',
      method: 'POST',
      connections: 50,
      pipelining: 1,
      duration: 10,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: 'loadtest@example.com' }),
    },
    (err, result) => {
      if (err) {
        console.error('Error running autocannon:', err);
        return;
      }

      const reportPath = path.join(__dirname, 'report_auth_load.json');
      writeFileSync(reportPath, JSON.stringify(result, null, 2));

      console.log('=== LOAD TEST RESULTS ===');
      console.log(`Requests: ${result.requests.average} req/sec`);
      console.log(`Latency: ${result.latency.average} ms average, ${result.latency.p99} ms (p99)`);
      console.log(`Total Requests: ${result.requests.total}`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Timeouts: ${result.timeouts}`);
      console.log(`Non-2xx Responses: ${result.non2xx}`);
      console.log(`Report saved to ${reportPath}`);
      console.log(
        'Note: Most requests should be 429 Too Many Requests if rate limiting works correctly under load.',
      );
    },
  );

  autocannon.track(instance, { renderProgressBar: true });
};

runLoadTest();
