const BASE_URL = 'http://localhost:5000/api';

async function testAuth() {
  const email = `test_${Date.now()}@example.com`;
  const name = 'Test User';
  const password = 'Password123';

  console.log(`Starting authentication test suite...`);
  console.log(`Using email: ${email}\n`);

  try {
    // 1. Verify Connection / Root
    console.log('1. Testing server connection...');
    const rootRes = await fetch('http://localhost:5000/api');
    const rootData = await rootRes.json();
    console.log('Root response:', rootData);

    // 2. Register
    console.log('\n2. Testing POST /api/auth/register...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const registerData = await registerRes.json();
    console.log('Register response:', registerData);
    if (!registerRes.ok) throw new Error('Registration failed');

    // 3. Login
    console.log('\n3. Testing POST /api/auth/login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    if (!loginRes.ok) throw new Error('Login failed');
    const token = loginData.token;

    // 4. Get Profile (expecting default/null values)
    console.log('\n4. Testing GET /api/auth/profile (default profile)...');
    const getProfileRes1 = await fetch(`${BASE_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const profileData1 = await getProfileRes1.json();
    console.log('Profile (Initial):', profileData1);
    if (!getProfileRes1.ok) throw new Error('Get profile failed');

    // 5. Update Profile
    console.log('\n5. Testing PUT /api/auth/profile...');
    const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        age: 28,
        height: 180.5,
        weight: 82.3,
        gender: 'Male',
        activityLevel: 'Medium'
      })
    });
    const updateData = await updateProfileRes.json();
    console.log('Update response:', updateData);
    if (!updateProfileRes.ok) throw new Error('Update profile failed');

    // 6. Get Profile (expecting updated values)
    console.log('\n6. Testing GET /api/auth/profile (updated profile)...');
    const getProfileRes2 = await fetch(`${BASE_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const profileData2 = await getProfileRes2.json();
    console.log('Profile (Updated):', profileData2);
    if (!getProfileRes2.ok) throw new Error('Get profile failed');

    console.log('\nSUCCESS: All authentication tests passed!');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
  }
}

testAuth();
