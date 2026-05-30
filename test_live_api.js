/**
 * Test Live Production API
 */


async function testLiveLogin() {
  console.log('Testing live API login endpoint...');
  try {
    const res = await fetch('https://billing-system-udie.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Origin': 'https://billing.thesmgroups.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loginId: 'nonexistent@test.com',
        password: 'wrongpassword'
      })
    });
    
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('Response body:', data);
  } catch (err) {
    console.error('Error hitting live API:', err);
  }
}

testLiveLogin();
