const BASE_URL = 'http://localhost:5000/api';

async function testActivity() {
  const email = `test_activity_${Date.now()}@example.com`;
  const name = 'Activity Tester';
  const password = 'Password123';

  console.log(`Starting Activity Tracking integration tests...`);
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
    console.log('\n3. Testing GET /api/activities without token...');
    const unauthorizedRes = await fetch(`${BASE_URL}/activities`);
    if (unauthorizedRes.status !== 401) {
      throw new Error('Endpoint did not enforce authorization check.');
    }

    // 4. Log workout (Running, 30 minutes, 300 calories, 5.2 km)
    console.log('\n4. Testing POST /api/activities...');
    const postRes1 = await fetch(`${BASE_URL}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        activity_type: 'Running',
        duration: 30,
        calories_burned: 300,
        distance_km: 5.2,
        activity_date: new Date().toISOString().substring(0, 10)
      })
    });
    const postData1 = await postRes1.json();
    console.log('Post 1 response:', postData1);
    if (!postRes1.ok) throw new Error('Post activity failed');
    const record1Id = postData1.id;

    // 5. Get Activity History
    console.log('\n5. Testing GET /api/activities (History)...');
    const historyRes = await fetch(`${BASE_URL}/activities`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    console.log('History records:', historyData);
    if (!historyRes.ok) throw new Error('Get activity history failed');
    if (historyData.length !== 1) throw new Error(`Expected 1 record, got ${historyData.length}`);

    // Verify properties
    const item = historyData[0];
    if (item.activity_type !== 'Running' || Number(item.duration) !== 30 || Number(item.calories_burned) !== 300) {
      throw new Error('Retrieved fields values do not match input values.');
    }

    // 6. Update Activity Log
    console.log(`\n6. Testing PUT /api/activities/${record1Id} (Update duration & calories)...`);
    const putRes = await fetch(`${BASE_URL}/activities/${record1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        activity_type: 'Running',
        duration: 45,
        calories_burned: 450,
        distance_km: 7.5,
        activity_date: new Date().toISOString().substring(0, 10)
      })
    });
    const putData = await putRes.json();
    console.log('Put response:', putData);
    if (!putRes.ok) throw new Error('Update activity failed');

    // Verify update
    console.log('\nVerifying updated record in history...');
    const verifyRes = await fetch(`${BASE_URL}/activities`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    console.log('History post-update:', verifyData);
    if (Number(verifyData[0].duration) !== 45 || Number(verifyData[0].calories_burned) !== 450) {
      throw new Error(`Expected duration 45 and calories 450, got ${verifyData[0].duration} and ${verifyData[0].calories_burned}`);
    }

    // 7. Delete Activity record
    console.log(`\n7. Testing DELETE /api/activities/${record1Id}...`);
    const deleteRes = await fetch(`${BASE_URL}/activities/${record1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!deleteRes.ok) throw new Error('Delete activity failed');

    // Verify history empty
    const finalRes = await fetch(`${BASE_URL}/activities`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalData = await finalRes.json();
    console.log('Final records:', finalData);
    if (finalData.length !== 0) throw new Error(`Expected 0 records, got ${finalData.length}`);

    console.log('\nSUCCESS: All Activity Tracking integration tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testActivity();
