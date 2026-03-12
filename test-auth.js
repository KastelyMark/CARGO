async function testAuth() {
    try {
        console.log('Testing authentication flow...');
        
        
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@test.com',
                password: 'test123'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login successful:', loginData);
        
        if (loginData.success && loginData.token) {
            const token = loginData.token;
            console.log('Token received:', token);
            
          
            const meResponse = await fetch('http://localhost:5000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const meData = await meResponse.json();
            console.log('/auth/me response:', meData);
            
            // Test cars endpoint with token
            const carsResponse = await fetch('http://localhost:5000/api/cars', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const carsData = await carsResponse.json();
            console.log('Cars endpoint works:', carsData.success);
            console.log('Number of cars:', carsData.cars.length);
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testAuth();