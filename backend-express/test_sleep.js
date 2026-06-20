const BASE_URL = 'http://localhost:5000/api';

async function testSleep() {
  const email = `test_sleep_${Date.now()}@example.com`;
  const name = 'Sleep Tester';
  const password = 'Password123';

  console.log(`Starting Sleep Tracking integration tests...`);
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
    console.log('\n3. Testing GET /api/sleep without token...');
    const unauthorizedRes = await fetch(`${BASE_URL}/sleep`);
    if (unauthorizedRes.status !== 401) {
      throw new Error('Endpoint did not enforce authorization check.');
    }

    // 4. Log sleep intervals (8 hours sleep, quality score 8)
    console.log('\n4. Testing POST /api/sleep...');
    const sleepStart1 = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(); // 10 hours ago
    const sleepEnd1 = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    const qualityScore1 = 8;
    const postRes1 = await fetch(`${BASE_URL}/sleep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sleep_start: sleepStart1,
        sleep_end: sleepEnd1,
        quality_score: qualityScore1
      })
    });
    const postData1 = await postRes1.json();
    console.log('Post 1 response:', postData1);
    if (!postRes1.ok) throw new Error('Post sleep failed');
    const record1Id = postData1.id;

    // 5. Get Sleep History
    console.log('\n5. Testing GET /api/sleep (History)...');
    const historyRes = await fetch(`${BASE_URL}/sleep`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    console.log('History records:', historyData);
    if (!historyRes.ok) throw new Error('Get sleep history failed');
    if (historyData.length !== 1) throw new Error(`Expected 1 record, got ${historyData.length}`);

    // Verify calculated hours (10 hours sleep)
    if (parseFloat(historyData[0].totalHours) !== 8.0) {
      throw new Error(`Expected 8 hours, got ${historyData[0].totalHours}`);
    }

    // 6. Update Sleep Log
    console.log(`\n6. Testing PUT /api/sleep/${record1Id} (Update quality & time)...`);
    const newQuality = 9;
    const sleepEndUpdated = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // wake up 1 hour later
    const putRes = await fetch(`${BASE_URL}/sleep/${record1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sleep_start: sleepStart1,
        sleep_end: sleepEndUpdated,
        quality_score: newQuality
      })
    });
    const putData = await putRes.json();
    console.log('Put response:', putData);
    if (!putRes.ok) throw new Error('Update sleep failed');

    // Verify update
    console.log('\nVerifying updated record in history...');
    const verifyRes = await fetch(`${BASE_URL}/sleep`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    console.log('History post-update:', verifyData);
    if (verifyData[0].qualityScore !== newQuality) {
      throw new Error(`Expected quality ${newQuality}, got ${verifyData[0].qualityScore}`);
    }
    if (parseFloat(verifyData[0].totalHours) !== 9.0) {
      throw new Error(`Expected 9 hours, got ${verifyData[0].totalHours}`);
    }

    // 7. Delete Sleep record
    console.log(`\n7. Testing DELETE /api/sleep/${record1Id}...`);
    const deleteRes = await fetch(`${BASE_URL}/sleep/${record1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!deleteRes.ok) throw new Error('Delete sleep failed');

    // Verify history empty
    const finalRes = await fetch(`${BASE_URL}/sleep`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalData = await finalRes.json();
    console.log('Final records:', finalData);
    if (finalData.length !== 0) throw new Error(`Expected 0 records, got ${finalData.length}`);

    console.log('\nSUCCESS: All Sleep Tracking integration tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testSleep();
