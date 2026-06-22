const BASE_URL = 'http://localhost:5000/api';

async function testDiet() {
  const email = `test_diet_${Date.now()}@example.com`;
  const name = 'Diet Tester';
  const password = 'Password123';

  console.log(`Starting Food Log & Diet Tracking integration tests...`);
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
    console.log('\n3. Testing GET /api/foods without token (should fail with 401)...');
    const unauthorizedRes = await fetch(`${BASE_URL}/foods`);
    if (unauthorizedRes.status !== 401) {
      throw new Error('Endpoint did not enforce authorization checks.');
    }
    console.log('OK: Got expected 401 Unauthorized');

    // 4. Log food (Roti, 2 pieces, BREAKFAST, auto-nutrients)
    console.log('\n4. Testing POST /api/foods (Logging 2 Roti, BREAKFAST, letting system auto-calculate)...');
    const postRes1 = await fetch(`${BASE_URL}/foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        food_name: 'Roti',
        quantity: 2,
        unit: 'pieces',
        meal_type: 'BREAKFAST'
      })
    });
    const postData1 = await postRes1.json();
    console.log('Post 1 response:', postData1);
    if (!postRes1.ok) throw new Error('Post food failed');
    const recordId = postData1.id;

    // 5. Test Autocomplete Nutrient Scaling Verification
    console.log('\n5. Verifying database record scaled nutrients correctly (Roti base x2)...');
    const getRes1 = await fetch(`${BASE_URL}/foods`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData1 = await getRes1.json();
    console.log('Logged foods list:', getData1);
    if (getData1.length !== 1) throw new Error('Expected exactly 1 food record');
    const loggedRoti = getData1[0];
    
    // Roti base: calories: 120, protein: 3.5, carbs: 22, fat: 0.5, fiber: 2.2
    // Scale x2: calories: 240, protein: 7, carbs: 44, fat: 1, fiber: 4.4
    console.log('Nutrients scaled values:', {
      calories: loggedRoti.calories,
      protein: loggedRoti.protein,
      carbs: loggedRoti.carbs,
      fat: loggedRoti.fat,
      fiber: loggedRoti.fiber
    });
    if (Number(loggedRoti.calories) !== 240 || Number(loggedRoti.protein) !== 7 || Number(loggedRoti.carbs) !== 44) {
      throw new Error('Autocomplete nutrients did not scale correctly.');
    }
    console.log('OK: Nutrient scale verification passed');

    // 6. Test Duplicate Entry Prevention (same food, meal, and date logged within 10 seconds)
    console.log('\n6. Testing duplicate logging prevention (logging 2 Roti again immediately)...');
    const postResDuplicate = await fetch(`${BASE_URL}/foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        food_name: 'Roti',
        quantity: 2,
        unit: 'pieces',
        meal_type: 'BREAKFAST'
      })
    });
    console.log('Duplicate status code:', postResDuplicate.status);
    if (postResDuplicate.status !== 409) {
      throw new Error(`Expected status 409 Conflict, got ${postResDuplicate.status}`);
    }
    console.log('OK: Duplicate check successfully triggered 409 Conflict');

    // 7. Test negative inputs validations
    console.log('\n7. Testing negative quantity constraint check...');
    const postResNegative = await fetch(`${BASE_URL}/foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        food_name: 'Rice',
        quantity: -1,
        unit: 'cups',
        meal_type: 'LUNCH'
      })
    });
    console.log('Negative check status code:', postResNegative.status);
    if (postResNegative.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${postResNegative.status}`);
    }
    console.log('OK: Negative checks successfully triggered 400 Bad Request');

    // 8. Test PUT /api/foods/:id (Update quantity to 3)
    console.log(`\n8. Testing PUT /api/foods/${recordId} (updating quantity to 3 Roti)...`);
    const putRes = await fetch(`${BASE_URL}/foods/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        quantity: 3,
        calories: 360,
        protein: 10.5,
        carbs: 66,
        fat: 1.5,
        fiber: 6.6
      })
    });
    console.log('Put response status:', putRes.status);
    if (!putRes.ok) throw new Error('Update food failed');

    // 9. Verify Update results
    console.log('\nVerifying updated record details...');
    const verifyRes = await fetch(`${BASE_URL}/foods`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    console.log('History after update:', verifyData);
    if (Number(verifyData[0].quantity) !== 3 || Number(verifyData[0].calories) !== 360) {
      throw new Error(`Expected quantity 3 and calories 360, got ${verifyData[0].quantity} and ${verifyData[0].calories}`);
    }
    console.log('OK: Food log update verified');

    // 10. Test GET /api/diet/goals (Recommended fallback verification)
    console.log('\n10. Testing GET /api/diet/goals (Calculates defaults if not set)...');
    const goalsGetRes = await fetch(`${BASE_URL}/diet/goals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const goalsGetData = await goalsGetRes.json();
    console.log('Goals data retrieved:', goalsGetData);
    if (!goalsGetRes.ok) throw new Error('Get goals failed');
    if (goalsGetData.is_custom !== false) throw new Error('Expected is_custom to be false (profile calculations)');
    console.log('OK: Goal fallback calculations returned');

    // 11. Test PUT /api/diet/goals (Set custom targets)
    console.log('\n11. Testing PUT /api/diet/goals (Setting custom goal targets)...');
    const goalsPutRes = await fetch(`${BASE_URL}/diet/goals`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        goal_type: 'WEIGHT_LOSS',
        target_calories: 1600,
        target_protein: 110,
        target_carbs: 180,
        target_fat: 50
      })
    });
    const goalsPutData = await goalsPutRes.json();
    console.log('Goals put response:', goalsPutData);
    if (!goalsPutRes.ok) throw new Error('Set goals failed');

    // Verify goals update
    const goalsVerifyRes = await fetch(`${BASE_URL}/diet/goals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const goalsVerifyData = await goalsVerifyRes.json();
    console.log('Goals after save:', goalsVerifyData);
    if (goalsVerifyData.goal_type !== 'WEIGHT_LOSS' || goalsVerifyData.target_calories !== 1600) {
      throw new Error('Goal parameters do not match update inputs.');
    }
    console.log('OK: Custom goals update verified');

    // 12. Test GET /api/nutrition/today
    console.log('\n12. Testing GET /api/nutrition/today (Macro deficit evaluation)...');
    const nutritionRes = await fetch(`${BASE_URL}/nutrition/today`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const nutritionData = await nutritionRes.json();
    console.log('Today\'s nutrition status:', nutritionData);
    if (!nutritionRes.ok) throw new Error('Get today nutrition failed');
    // Consumed: 360 kcal, Targets: 1600 kcal. Remaining: 1240 kcal
    if (nutritionData.consumed.calories !== 360 || nutritionData.targets.calories !== 1600) {
      throw new Error('Nutrition balance calculations mismatched.');
    }
    console.log('OK: Deficit summary calculations verified');

    // 13. Test GET /api/nutrition/recommendations
    console.log('\n13. Testing GET /api/nutrition/recommendations (Personalized recommendations)...');
    const recsRes = await fetch(`${BASE_URL}/nutrition/recommendations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const recsData = await recsRes.json();
    console.log('Recommendations received:', JSON.stringify(recsData, null, 2));
    if (!recsRes.ok) throw new Error('Get recommendations failed');
    if (recsData.recommendations.length === 0) throw new Error('Expected recommendation categories');
    console.log('OK: Food recommendations engine verified');

    // 14. Test DELETE /api/foods/:id
    console.log(`\n14. Testing DELETE /api/foods/${recordId}...`);
    const deleteRes = await fetch(`${BASE_URL}/foods/${recordId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!deleteRes.ok) throw new Error('Delete food failed');
    console.log('OK: Log entry deleted successfully');

    // Final check
    const finalGetRes = await fetch(`${BASE_URL}/foods`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalGetData = await finalGetRes.json();
    if (finalGetData.length !== 0) throw new Error('Expected 0 food records remaining');

    console.log('\nSUCCESS: All Food Log & Diet Tracking integration tests passed! 🎉');
  } catch (error) {
    console.error('\nERROR: Test execution failed:', error.message);
    process.exit(1);
  }
}

testDiet();
