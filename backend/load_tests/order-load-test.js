const autocannon = require('autocannon');
const { writeFileSync } = require('fs');
const path = require('path');

const runLoadTest = async () => {
  console.log('Starting Autocannon Load Test (Concurrent Checkout Race Condition)...');

  const instance = autocannon(
    {
      url: 'http://localhost:5000/api/v1/orders/checkout',
      method: 'POST',
      connections: 100,
      pipelining: 1,
      duration: 15,
      headers: {
        'content-type': 'application/json',
        // Provide a valid or mock auth token if testing full pipeline,
        // here we assume a load test mock token if configured in middleware
        Authorization: 'Bearer ADMIN_TEST_TOKEN',
      },
      body: JSON.stringify({
        items: [{ productId: '662f1a2b3c4d5e6f7a8b9c0d', quantity: 1 }],
        deliveryDate: '2030-10-10',
        deliveryTime: 'Morning',
        address: '123 Load Test St',
      }),
    },
    (err, result) => {
      if (err) {
        console.error('Error running autocannon:', err);
        return;
      }

      const reportPath = path.join(__dirname, 'report_order_load.json');
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
        'Note: Most requests should be 409 Conflict (Inventory Reservation Failed) since we are requesting the same item concurrently.',
      );
    },
  );

  autocannon.track(instance, { renderProgressBar: true });
};

runLoadTest();
