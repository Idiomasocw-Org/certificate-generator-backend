import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY');
    process.exit(1);
}

// Intentamos crear el cliente admin
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function cleanup() {
    console.log('🧹 Iniciando limpieza de usuarios...');

    // 1. Listar usuarios (Requiere Service Role Key)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error al listar usuarios (Probablemente la llave no es Service Role):', listError.message);
        return;
    }

    console.log('👥 Usuarios encontrados en el sistema:', users.map(u => u.email).join(', ') || 'Ninguno');

    const targetEmails = ['barbaraarias844@gmail.com'];
    const usersToDelete = users.filter(u => !targetEmails.includes(u.email));

    console.log(`🔍 Encontrados ${usersToDelete.length} usuarios para borrar.`);

    for (const user of usersToDelete) {
        console.log(`🗑️  Borrando: ${user.email}...`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
            console.error(`❌ Falló borrar ${user.email}:`, deleteError.message);
        } else {
            console.log(`✅ Borrado exitoso.`);
        }
    }

    console.log('✨ Proceso terminado.');
}

cleanup();
