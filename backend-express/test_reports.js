const BASE_URL = 'http://localhost:5000/api';

async function testReports() {
  const email = `test_reports_${Date.now()}@example.com`;
  const name = 'Reports Tester';
  const password = 'Password123';

  console.log(`Starting Reports & Analytics integration tests...`);
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

    // 3. Log values across multiple days
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    console.log('3. Logging historical data (today, yesterday, 2 days ago, 3 days ago)...');
    
    // Logging water
    console.log('Logging water...');
    await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount_ml: 2000, consumed_at: today.toISOString() })
    });
    await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount_ml: 1500, consumed_at: new Date(today.getTime() - oneDay).toISOString() })
    });
    await fetch(`${BASE_URL}/water`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount_ml: 3000, consumed_at: new Date(today.getTime() - 2 * oneDay).toISOString() })
    });

    // Logging sleep
    console.log('Logging sleep...');
    await fetch(`${BASE_URL}/sleep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        sleep_start: new Date(today.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        sleep_end: today.toISOString()
      })
    });
    await fetch(`${BASE_URL}/sleep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        sleep_start: new Date(today.getTime() - oneDay - 7 * 60 * 60 * 1000).toISOString(),
        sleep_end: new Date(today.getTime() - oneDay).toISOString()
      })
    });

    // Logging weight
    console.log('Logging weight...');
    await fetch(`${BASE_URL}/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ weight: 80.0, recordedAt: new Date(today.getTime() - 3 * oneDay).toISOString() })
    });
    await fetch(`${BASE_URL}/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ weight: 79.2, recordedAt: today.toISOString() })
    });

    // Logging activities
    console.log('Logging activities...');
    await fetch(`${BASE_URL}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        activity_type: 'Running',
        duration: 30,
        calories_burned: 250,
        activityDate: today.toLocaleDateString('en-CA')
      })
    });
    await fetch(`${BASE_URL}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        activity_type: 'Yoga',
        duration: 45,
        calories_burned: 150,
        activityDate: new Date(today.getTime() - 2 * oneDay).toLocaleDateString('en-CA')
      })
    });

    // 4. Create multiple goals (ACTIVE & COMPLETED)
    console.log('4. Setting up goals...');
    await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        goal_type: 'Water',
        target_value: 3000,
        current_value: 2000,
        status: 'ACTIVE'
      })
    });
    await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        goal_type: 'Weight',
        target_value: 78,
        current_value: 78,
        status: 'COMPLETED'
      })
    });

    // 5. Test Weekly Report
    console.log('\n5. Testing GET /api/reports/weekly...');
    const weeklyRes = await fetch(`${BASE_URL}/reports/weekly`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const weeklyData = await weeklyRes.json();
    console.log('Weekly report metadata:', {
      avg_sleep: weeklyData.avg_sleep,
      avg_water: weeklyData.avg_water,
      total_workouts: weeklyData.total_workouts,
      weight_change: weeklyData.weight_change,
      daily_length: weeklyData.daily_data ? weeklyData.daily_data.length : 0
    });
    if (!weeklyRes.ok) throw new Error('Weekly report fetch failed');
    if (weeklyData.daily_data.length !== 7) throw new Error(`Expected 7 daily data entries, got ${weeklyData.daily_data.length}`);
    if (weeklyData.total_workouts !== 2) throw new Error(`Expected 2 workouts, got ${weeklyData.total_workouts}`);
    if (weeklyData.weight_change !== -0.8) throw new Error(`Expected weight change -0.8, got ${weeklyData.weight_change}`);

    // 6. Test Monthly Report
    console.log('\n6. Testing GET /api/reports/monthly...');
    const monthlyRes = await fetch(`${BASE_URL}/reports/monthly`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const monthlyData = await monthlyRes.json();
    console.log('Monthly report metadata:', {
      avg_sleep: monthlyData.avg_sleep,
      avg_water: monthlyData.avg_water,
      total_workouts: monthlyData.total_workouts,
      daily_length: monthlyData.daily_data ? monthlyData.daily_data.length : 0
    });
    if (!monthlyRes.ok) throw new Error('Monthly report fetch failed');
    if (monthlyData.daily_data.length !== 30) throw new Error(`Expected 30 daily data entries, got ${monthlyData.daily_data.length}`);

    // 7. Test Progress Analytics
    console.log('\n7. Testing GET /api/reports/progress...');
    const progressRes = await fetch(`${BASE_URL}/reports/progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const progressData = await progressRes.json();
    console.log('Progress analytics response sample:', {
      goals_summary: progressData.goals_summary,
      goals_length: progressData.goals ? progressData.goals.length : 0,
      weekly_trends_length: progressData.weekly_trends ? progressData.weekly_trends.length : 0,
      weekly_trends: progressData.weekly_trends
    });
    if (!progressRes.ok) throw new Error('Progress report fetch failed');
    if (progressData.goals_summary.active !== 1 || progressData.goals_summary.completed !== 1) {
      throw new Error('Goals summary counts incorrect.');
    }
    if (progressData.weekly_trends.length !== 4) {
      throw new Error(`Expected 4 weekly trends records, got ${progressData.weekly_trends.length}`);
    }

    console.log('\nSUCCESS: All Reports & Analytics integration tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testReports();
