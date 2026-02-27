import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/barbara/ultime certificate/certificate-generator-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function signUpUser() {
    const email = 'barbaraburoz@gmail.com';
    const password = '134340btsbarBK';

    console.log(`📡 Intentando registro normal de: ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        console.error('❌ Error en signUp:', error.message);
    } else {
        console.log('✅ Registro iniciado.');
        console.log('User status:', data.user?.identities);
        if (data.session) {
            console.log('✅ Sesión iniciada automáticamente.');
        } else {
            console.log('📧 Se requiere verificación de email (o el límite de correos se alcanzó).');
        }
    }
}

signUpUser();
