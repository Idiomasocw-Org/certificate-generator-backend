import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    // IMPORTANTE: Configura estas variables en tu .env local antes de ejecutar este script

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
