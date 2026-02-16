import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const TEST_EMAIL = `deploy_test_${Date.now()}@example.com`;
const TEST_PASS = 'TestPass123!';

async function setup() {
    console.log(`Setting up test user: ${TEST_EMAIL}`);
    const { data, error } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASS,
        email_confirm: true // AUTO-CONFIRM
    });

    if (error) {
        console.error('Error creating test user:', error.message);
        return;
    }

    console.log('✅ Test user created and confirmed.');

    // Now call the integration test flow
    // I'll just write the rest of the flow here
    const API_URL = 'http://localhost:3000';

    try {
        console.log('\n1. Login...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login falló: ${loginData.error}`);
        const authToken = loginData.session.access_token;
        console.log('✅ Login exitoso.');

        console.log('\n2. Generate Certificate...');
        const certRes = await fetch(`${API_URL}/api/certificates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth_token=${authToken}`
            },
            body: JSON.stringify({
                studentName: 'Verification Admin User',
                level: 'B1',
                date: '2026-02-16'
            })
        });
        if (!certRes.ok) throw new Error('Certs falló');
        console.log('✅ Certificado generado.');

        console.log('\n3. Cleanup...');
        await supabase.auth.admin.deleteUser(data.user.id);
        console.log('✅ Test user deleted.');

        console.log('\n🚀 ALL TESTS PASSED! READY FOR DEPLOYMENT.');
    } catch (e) {
        console.error('❌ Integration test failed:', e.message);
    }
}

setup();
