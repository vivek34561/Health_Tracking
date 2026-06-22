const BASE_URL = 'http://localhost:5000/api';

async function testWeight() {
  const email = `test_weight_${Date.now()}@example.com`;
  const name = 'Weight Tester';
  const password = 'Password123';

  console.log(`Starting Weight Tracking integration tests...`);
  console.log(`Using email: ${email}\n`);

  try {
    // 1. Register a test user
    console.log('1. Registering test user...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const registerData = await registerRes.json();
    console.log('Register response:', registerData);
    if (!registerRes.ok) throw new Error('Registration failed');

    // 2. Login
    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    if (!loginRes.ok) throw new Error('Login failed');
    const token = loginData.token;

    // 3. Test Unauthorized Access
    console.log('\n3. Testing GET /api/weights without token...');
    const unauthorizedRes = await fetch(`${BASE_URL}/weights`);
    const unauthorizedData = await unauthorizedRes.json();
    console.log('Unauthorized status:', unauthorizedRes.status);
    console.log('Unauthorized response:', unauthorizedData);
    if (unauthorizedRes.status !== 401) {
      throw new Error('Endpoint did not enforce authorization check.');
    }

    // 4. Add Weight logs
    console.log('\n4. Testing POST /api/weights...');
    const weight1 = 80.5;
    const date1 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const postRes1 = await fetch(`${BASE_URL}/weights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ weight: weight1, recordedAt: date1 })
    });
    const postData1 = await postRes1.json();
    console.log('Post 1 response:', postData1);
    if (!postRes1.ok) throw new Error('Post weight 1 failed');
    const record1Id = postData1.id;

    // Add weight 2 without explicit date
    const weight2 = 79.8;
    const postRes2 = await fetch(`${BASE_URL}/weights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ weight: weight2 })
    });
    const postData2 = await postRes2.json();
    console.log('Post 2 response:', postData2);
    if (!postRes2.ok) throw new Error('Post weight 2 failed');
    const record2Id = postData2.id;

    // 5. Get Weight History
    console.log('\n5. Testing GET /api/weights (History)...');
    const historyRes = await fetch(`${BASE_URL}/weights`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    console.log('History records:', historyData);
    if (!historyRes.ok) throw new Error('Get weight history failed');
    if (historyData.length !== 2) throw new Error(`Expected 2 records, got ${historyData.length}`);

    // The order should be descending (recorded_at DESC), so the record2 (created latest) should be index 0
    if (parseFloat(historyData[0].weight) !== weight2) {
      throw new Error('History ordering or weight matches incorrect.');
    }

    // 6. Update Weight log
    console.log(`\n6. Testing PUT /api/weights/${record1Id} (Update weight)...`);
    const updatedWeight = 81.2;
    const putRes = await fetch(`${BASE_URL}/weights/${record1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ weight: updatedWeight, recordedAt: date1 })
    });
    const putData = await putRes.json();
    console.log('Put response:', putData);
    if (!putRes.ok) throw new Error('Update weight failed');

    // Verify history updated
    console.log('\nVerifying updated weight in history...');
    const verifyRes = await fetch(`${BASE_URL}/weights`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    const target = verifyData.find(item => item.id === record1Id);
    console.log('Target record after update:', target);
    if (parseFloat(target.weight) !== updatedWeight) {
      throw new Error(`Expected weight ${updatedWeight}, got ${target.weight}`);
    }

    // 7. Delete Weight log
    console.log(`\n7. Testing DELETE /api/weights/${record2Id}...`);
    const deleteRes = await fetch(`${BASE_URL}/weights/${record2Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const deleteData = await deleteRes.json();
    console.log('Delete response:', deleteData);
    if (!deleteRes.ok) throw new Error('Delete weight failed');

    // Verify history after deletion
    console.log('\nVerifying list size after deletion...');
    const finalRes = await fetch(`${BASE_URL}/weights`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalData = await finalRes.json();
    console.log('Final records:', finalData);
    if (finalData.length !== 1) throw new Error(`Expected 1 record remaining, got ${finalData.length}`);

    console.log('\nSUCCESS: All Weight Tracking integration tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testWeight();
