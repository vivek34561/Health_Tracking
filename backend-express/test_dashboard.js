const BASE_URL = 'http://localhost:5000/api';

async function testDashboard() {
  const email = `test_dashboard_${Date.now()}@example.com`;
  const name = 'Dashboard Tester';
  const password = 'Password123';

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
    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed');
    const token = loginData.token;

    // 3. Update profile with baseline weight
    console.log('\n3. Updating profile baseline weight...');
    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        age: 30,
        height: 180,
        weight: 80.0,
        gender: 'MALE'
      })
    });
    if (!profileRes.ok) throw new Error('Profile update failed');

    // 4. Get Dashboard Summary (Initial state)
    console.log('\n4. Testing GET /api/dashboard (Initial State)...');
    const dashRes1 = await fetch(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dashData1 = await dashRes1.json();
    console.log('Initial dashboard data:', dashData1);
    if (!dashRes1.ok) throw new Error('Fetch dashboard 1 failed');
    if (dashData1.current_weight !== 80.0) throw new Error(`Expected current_weight 80, got ${dashData1.current_weight}`);
    if (dashData1.weight_change !== null) throw new Error(`Expected weight_change null, got ${dashData1.weight_change}`);
    if (dashData1.water_consumed !== 0) throw new Error(`Expected water_consumed 0, got ${dashData1.water_consumed}`);

    // 5. Add weight record (80.5 kg) to check weight_change calculation
    console.log('\n5. Logging weight record (80.5 kg)...');
    const weightRes = await fetch(`${BASE_URL}/weights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ weight: 80.5 })
    });
    if (!weightRes.ok) throw new Error('Weight log failed');

    // 6. Add water intake log (500 ml)
    console.log('\n6. Logging water intake log (500 ml)...');
    const waterRes = await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount_ml: 500 })
    });
    if (!waterRes.ok) throw new Error('Water log failed');

    // 7. Add sleep record (8 hours, quality 7)
    console.log('\n7. Logging sleep record (8 hours, quality 7)...');
    const sleepStart = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const sleepEnd = new Date().toISOString();
    const sleepRes = await fetch(`${BASE_URL}/sleep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sleep_start: sleepStart,
        sleep_end: sleepEnd,
        quality_score: 7
      })
    });
    if (!sleepRes.ok) throw new Error('Sleep log failed');

    // 8. Add activity (Running, 30 min, 250 kcal)
    console.log('\n8. Logging activity session...');
    const activityRes = await fetch(`${BASE_URL}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        activity_type: 'Running',
        duration: 30,
        calories_burned: 250
      })
    });
    if (!activityRes.ok) throw new Error('Activity log failed');

    // 9. Add two goals: one completed, one active
    console.log('\n9. Logging goals...');
    const goalRes1 = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ goal_type: 'Water', target_value: 3000, current_value: 1000 })
    });
    if (!goalRes1.ok) throw new Error('Goal 1 log failed');
    const goal1Data = await goalRes1.json();

    const goalRes2 = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ goal_type: 'Sleep', target_value: 8, current_value: 8 })
    });
    if (!goalRes2.ok) throw new Error('Goal 2 log failed');
    const goal2Data = await goalRes2.json();

    // Mark goal 2 as completed
    console.log('Completing goal 2...');
    const completeGoalRes = await fetch(`${BASE_URL}/goals/${goal2Data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    if (!completeGoalRes.ok) throw new Error('Goal 2 update failed');

    // 10. Get Dashboard Summary (State with logged data)
    console.log('\n10. Testing GET /api/dashboard (With Data)...');
    const dashRes2 = await fetch(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dashData2 = await dashRes2.json();
    console.log('Final dashboard data:', dashData2);
    if (!dashRes2.ok) throw new Error('Fetch dashboard 2 failed');

    // Assert values
    if (dashData2.current_weight !== 80.5) throw new Error(`Expected current_weight 80.5, got ${dashData2.current_weight}`);
    // weight_change should be 80.5 - 80.0 = 0.5
    if (dashData2.weight_change !== 0.5) throw new Error(`Expected weight_change 0.5, got ${dashData2.weight_change}`);
    if (dashData2.water_consumed !== 500) throw new Error(`Expected water_consumed 500, got ${dashData2.water_consumed}`);
    if (dashData2.sleep_hours !== 8) throw new Error(`Expected sleep_hours 8, got ${dashData2.sleep_hours}`);
    if (dashData2.sleep_quality !== 7) throw new Error(`Expected sleep_quality 7, got ${dashData2.sleep_quality}`);
    if (dashData2.activities_today !== 1) throw new Error(`Expected activities_today 1, got ${dashData2.activities_today}`);
    if (dashData2.calories_burned_today !== 250) throw new Error(`Expected calories_burned_today 250, got ${dashData2.calories_burned_today}`);
    if (dashData2.active_goals !== 1) throw new Error(`Expected active_goals 1, got ${dashData2.active_goals}`);
    if (dashData2.completed_goals !== 1) throw new Error(`Expected completed_goals 1, got ${dashData2.completed_goals}`);
    if (dashData2.goal_completion !== 50) throw new Error(`Expected goal_completion 50, got ${dashData2.goal_completion}`);

    console.log('\nSUCCESS: All Dashboard backend tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testDashboard();
