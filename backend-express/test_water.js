const BASE_URL = 'http://localhost:5000/api';

async function testWater() {
  const email = `test_water_${Date.now()}@example.com`;
  const name = 'Water Tester';
  const password = 'Password123';

  console.log(`Starting Water Tracking integration tests...`);
  console.log(`Using email: ${email}\n`);

  try {
    // 1. Register a test user
    console.log('1. Registering test user...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (!registerRes.ok) throw new Error('Registration failed');

    // 2. Login
    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed');
    const token = loginData.token;

    // 3. Test Unauthorized Access
    console.log('\n3. Testing GET /api/water without token...');
    const unauthorizedRes = await fetch(`${BASE_URL}/water`);
    if (unauthorizedRes.status !== 401) {
      throw new Error('Endpoint did not enforce authorization check.');
    }

    // 4. Add Water Intake logs
    console.log('\n4. Testing POST /api/water...');
    const amount1 = 250;
    const postRes1 = await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount_ml: amount1 })
    });
    const postData1 = await postRes1.json();
    console.log('Post 1 response:', postData1);
    if (!postRes1.ok) throw new Error('Post water 1 failed');
    const record1Id = postData1.id;

    const amount2 = 500;
    const date2 = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hr ago
    const postRes2 = await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount_ml: amount2, consumed_at: date2 })
    });
    const postData2 = await postRes2.json();
    console.log('Post 2 response:', postData2);
    if (!postRes2.ok) throw new Error('Post water 2 failed');
    const record2Id = postData2.id;

    // 5. Get Water History
    console.log('\n5. Testing GET /api/water (History)...');
    const historyRes = await fetch(`${BASE_URL}/water`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    console.log('History records:', historyData);
    if (!historyRes.ok) throw new Error('Get water history failed');
    if (historyData.length !== 2) throw new Error(`Expected 2 records, got ${historyData.length}`);

    // Order should be descending by consumedAt, so record1 (current date) should be first
    if (Number(historyData[0].amountMl) !== amount1) {
      throw new Error('History ordering or amount match incorrect.');
    }

    // 6. Delete Water log
    console.log(`\n6. Testing DELETE /api/water/${record2Id}...`);
    const deleteRes = await fetch(`${BASE_URL}/water/${record2Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const deleteData = await deleteRes.json();
    console.log('Delete response:', deleteData);
    if (!deleteRes.ok) throw new Error('Delete water failed');

    // Verify history after deletion
    console.log('\n7. Verifying list size after deletion...');
    const finalRes = await fetch(`${BASE_URL}/water`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalData = await finalRes.json();
    console.log('Final records:', finalData);
    if (finalData.length !== 1) throw new Error(`Expected 1 record remaining, got ${finalData.length}`);

    console.log('\nSUCCESS: All Water Tracking integration tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testWater();
