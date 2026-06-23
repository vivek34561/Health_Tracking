const BASE_URL = 'http://localhost:5000/api';

async function testGoals() {
  const email = `test_goal_${Date.now()}@example.com`;
  const name = 'Goal Tester';
  const password = 'Password123';

  console.log(`Starting Goals Tracking integration tests...`);
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
    console.log('\n3. Testing GET /api/goals without token...');
    const unauthorizedRes = await fetch(`${BASE_URL}/goals`);
    if (unauthorizedRes.status !== 401) {
      throw new Error('Endpoint did not enforce authorization check.');
    }

    // 4. Create Goal (Water, Target 3000, Start today, End today + 30 days)
    console.log('\n4. Testing POST /api/goals...');
    const targetValue = 3000;
    const postRes1 = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        goal_type: 'Steps',
        target_value: targetValue,
        current_value: 0
      })
    });
    const postData1 = await postRes1.json();
    console.log('Post 1 response:', postData1);
    if (!postRes1.ok) throw new Error('Post goal failed');
    const record1Id = postData1.id;

    // 5. Get Goals
    console.log('\n5. Testing GET /api/goals (Goals List)...');
    const historyRes = await fetch(`${BASE_URL}/goals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    console.log('History records:', historyData);
    if (!historyRes.ok) throw new Error('Get goals failed');
    if (historyData.length !== 1) throw new Error(`Expected 1 record, got ${historyData.length}`);

    // Verify properties
    const item = historyData[0];
    if (item.goal_type !== 'Steps' || Number(item.target_value) !== targetValue || Number(item.current_value) !== 0) {
      throw new Error('Retrieved fields values do not match input values.');
    }

    // 6. Update Goal Progress (current_value = 1500)
    console.log(`\n6. Testing PUT /api/goals/${record1Id} (Update progress value)...`);
    const newProgress = 1500;
    const putRes = await fetch(`${BASE_URL}/goals/${record1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        current_value: newProgress,
        status: 'ACTIVE'
      })
    });
    const putData = await putRes.json();
    console.log('Put response:', putData);
    if (!putRes.ok) throw new Error('Update goal failed');

    // Verify update
    console.log('\nVerifying updated record in history...');
    const verifyRes = await fetch(`${BASE_URL}/goals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    console.log('History post-update:', verifyData);
    if (Number(verifyData[0].current_value) !== newProgress) {
      throw new Error(`Expected current_value ${newProgress}, got ${verifyData[0].current_value}`);
    }

    // 7. Delete Goal record
    console.log(`\n7. Testing DELETE /api/goals/${record1Id}...`);
    const deleteRes = await fetch(`${BASE_URL}/goals/${record1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!deleteRes.ok) throw new Error('Delete goal failed');

    // Verify history empty
    const finalRes = await fetch(`${BASE_URL}/goals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalData = await finalRes.json();
    console.log('Final records:', finalData);
    if (finalData.length !== 0) throw new Error(`Expected 0 records, got ${finalData.length}`);

    console.log('\nSUCCESS: All Goals Tracking integration tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testGoals();
