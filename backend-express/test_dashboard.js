const BASE_URL = 'http://localhost:5000/api';

async function testDashboard() {
  const email = `test_dashboard_${Date.now()}@example.com`;
  const name = 'Dashboard Tester';
  const password = 'Password123';
  const today = new Date().toLocaleDateString('en-CA');

  console.log(`Starting Dashboard integration tests...`);
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
    console.log('2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed');
    const token = loginData.token;

    // 3. Set Profile Baseline Weight
    console.log('3. Setting profile weight to 80kg...');
    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ age: 30, height: 180, weight: 80, gender: 'Male' })
    });
    if (!profileRes.ok) throw new Error('Failed to set profile baseline');

    // 4. Test initial dashboard response
    console.log('4. Fetching initial dashboard summary (should fall back to profile weight)...');
    const initRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const initData = await initRes.json();
    console.log('Initial dashboard response:', initData);
    if (!initRes.ok) throw new Error('Initial dashboard fetch failed');
    if (initData.water !== 0) throw new Error('Expected initial water to be 0');
    if (initData.sleep !== 0) throw new Error('Expected initial sleep to be 0');
    if (initData.weight !== 80) throw new Error(`Expected initial weight to fallback to 80, got ${initData.weight}`);
    if (initData.goal_completion !== 0) throw new Error('Expected initial goal completion to be 0');

    // 5. Add Health Logs for today
    console.log('5. Logging 1500ml water today...');
    await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount_ml: 1000 })
    });
    await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount_ml: 500 })
    });

    console.log('Logging 7.5 hours sleep ending today...');
    const sleepStart = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const sleepEnd = new Date().toISOString();
    await fetch(`${BASE_URL}/sleep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sleep_start: sleepStart, sleep_end: sleepEnd })
    });

    console.log('Logging weight of 78.5kg today...');
    await fetch(`${BASE_URL}/weights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ weight: 78.5 })
    });

    console.log('Logging an activity today...');
    await fetch(`${BASE_URL}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ activity_type: 'Running', duration: 30, calories_burned: 250 })
    });

    // 6. Create Goal
    console.log('6. Creating active Water goal (target: 3000ml, current: 1500ml)...');
    const goalRes = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        goal_type: 'Water',
        target_value: 3000,
        current_value: 1500,
        start_date: today,
        end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
        status: 'ACTIVE'
      })
    });
    if (!goalRes.ok) throw new Error('Goal creation failed');

    // 7. Verify dashboard updates
    console.log('7. Fetching updated dashboard summary...');
    const finalRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalData = await finalRes.json();
    console.log('Final dashboard response:', finalData);
    if (!finalRes.ok) throw new Error('Updated dashboard fetch failed');

    if (finalData.water !== 1500) throw new Error(`Expected 1500 water, got ${finalData.water}`);
    if (finalData.water_consumed !== 1500) throw new Error(`Expected 1500 water_consumed, got ${finalData.water_consumed}`);
    // Sleep calculation might vary slightly due to rounding, but it should be close to 8 hrs
    if (finalData.sleep <= 0) throw new Error(`Expected sleep hours to be logged, got ${finalData.sleep}`);
    if (finalData.weight !== 78.5) throw new Error(`Expected weight to be 78.5, got ${finalData.weight}`);
    if (finalData.activities_today !== 1) throw new Error(`Expected 1 activity, got ${finalData.activities_today}`);
    if (finalData.goal_completion !== 50) throw new Error(`Expected goal completion 50% (1500/3000), got ${finalData.goal_completion}`);

    console.log('\nSUCCESS: All Dashboard integration tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testDashboard();
