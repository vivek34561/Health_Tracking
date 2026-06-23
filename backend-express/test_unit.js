const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('./src/app');

test('Express Server API Unit Tests', async (t) => {
  let server;
  let baseUrl;

  // Spin up an ephemeral HTTP server before running the tests
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  // Tear down server after all subtests complete
  t.after(() => {
    server.close();
  });

  await t.test('GET / should return root welcome message', async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.deepStrictEqual(data, { message: "Welcome to AI Health Tracking Core API" });
  });

  await t.test('POST /api/auth/register should fail validation if required fields are missing', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Only Name Passed' }) // Missing email & password
    });
    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Name, email, and password are required.');
  });
});
