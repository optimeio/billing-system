/**
 * Test Live Production API
 */


async function testLiveLogin() {
  console.log('Testing local API login endpoint...');
  try {
    const res = await fetch('http://localhost:5002/api/auth/login', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loginId: 'shreenithya111@gmail.com',
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
