import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3000';
const TEST_USER = {
    email: `test_deploy_${Date.now()}@ocw.com`,
    password: 'Password123'
};

let authToken = '';
let refreshToken = '';

async function runTests() {
    console.log('🧪 Iniciando Pruebas de Despliegue...\n');

    try {
        // 1. Root Health Check
        console.log('1. Verificando Health Check...');
        const health = await fetch(`${API_URL}/`).then(res => res.json());
        console.log('✅ Health check:', health);

        // 2. Registro
        console.log('\n2. Intentando Registro...');
        const regRes = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });
        const regData = await regRes.json();
        if (regRes.ok) {
            console.log('✅ Registro exitoso');
        } else {
            console.warn('⚠️ Nota:', regData.error);
        }

        // 3. Login
        console.log('\n3. Verificando Login...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login falló: ${loginData.error}`);
        authToken = loginData.session.access_token;
        refreshToken = loginData.session.refresh_token;
        console.log('✅ Login exitoso. JWT obtenido.');

        // 4. Me (Verify Session)
        console.log('\n4. Verificando Sesión (/api/auth/me)...');
        const meRes = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Cookie': `auth_token=${authToken}` }
        });
        const meData = await meRes.json();
        if (!meRes.ok) throw new Error('Me falló');
        console.log(`✅ Sesión válida para: ${meData.user.email}`);

        // 5. Generate Certificate
        console.log('\n5. Probando Generación de Certificado...');
        const certRes = await fetch(`${API_URL}/api/certificates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth_token=${authToken}`
            },
            body: JSON.stringify({
                studentName: 'Estudiante de Prueba Prod',
                level: 'C1',
                date: new Date().toISOString().split('T')[0]
            })
        });
        if (!certRes.ok) {
            const errData = await certRes.json();
            throw new Error(`Certs falló: ${errData.error}`);
        }
        console.log('✅ PDF generado exitosamente (Buffer recibido)');

        // 6. Refresh Token
        console.log('\n6. Probando Refresh Token...');
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Cookie': `refresh_token=${refreshToken}` }
        });
        if (!refreshRes.ok) throw new Error('Refresh falló');
        console.log('✅ Token refrescado exitosamente');

        console.log('\n✨ TODAS LAS PRUEBAS PASARON EXITOSAMENTE ✨');
        console.log('🚀 El producto está listo para producción.');

    } catch (error) {
        console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
        process.exit(1);
    }
}

runTests();
