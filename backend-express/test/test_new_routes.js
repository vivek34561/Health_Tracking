const BASE = 'http://localhost:5000/api';

async function test() {
  const email = 'test_newroutes_' + Date.now() + '@example.com';

  // Register + Login
  await fetch(BASE + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Tester', email, password: 'Password123' })
  });

  const loginRes = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  // 1. Test PUT /api/water/:id
  const addRes = await fetch(BASE + '/water', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ amount_ml: 500 })
  });
  const addData = await addRes.json();
  const id = addData.id;

  const putRes = await fetch(BASE + '/water/' + id, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({ amount_ml: 750 })
  });
  const putData = await putRes.json();
  if (!putRes.ok || !putData.success) throw new Error('PUT /water/:id FAILED: ' + JSON.stringify(putData));
  console.log('OK  PUT /api/water/:id       ->', putData.message);

  // 2. Test POST /api/auth/logout
  const logoutRes = await fetch(BASE + '/auth/logout', { method: 'POST', headers: h });
  const logoutData = await logoutRes.json();
  if (!logoutRes.ok || !logoutData.success) throw new Error('POST /auth/logout FAILED: ' + JSON.stringify(logoutData));
  console.log('OK  POST /api/auth/logout    ->', logoutData.message);

  // 3. Test PUT /api/auth/change-password
  const cpRes = await fetch(BASE + '/auth/change-password', {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({ current_password: 'Password123', new_password: 'NewPass456' })
  });
  const cpData = await cpRes.json();
  if (!cpRes.ok || !cpData.success) throw new Error('PUT /auth/change-password FAILED: ' + JSON.stringify(cpData));
  console.log('OK  PUT /api/auth/change-password ->', cpData.message);

  console.log('\nAll 3 new routes verified successfully!');
}

test().catch(function(e) {
  console.error('ERROR:', e.message);
  process.exit(1);
});
