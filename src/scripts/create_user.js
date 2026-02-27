import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/barbara/ultime certificate/certificate-generator-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
    const email = 'barbaraburoz@gmail.com';
    const password = '134340btsbarBK';

    console.log(`🔍 Buscando si existe rastro de: ${email}...`);
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        console.log(`🗑️ El usuario existe con ID ${existingUser.id}. Intentando borrarlo para limpiar...`);
        await supabase.auth.admin.deleteUser(existingUser.id);
    }

    console.log(`🚀 Creando usuario: ${email}...`);
    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (error) {
        console.error('❌ Error persistente:', error.message);
    } else {
        console.log(`✅ Usuario creado con éxito: ${data.user.email}`);
    }
}

createUser();
