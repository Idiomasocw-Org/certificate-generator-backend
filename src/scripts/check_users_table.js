import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/barbara/ultime certificate/certificate-generator-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
    console.log('📡 Intentando obtener información del esquema...');

    // Una forma de ver si hay errores de esquema es intentar insertar algo inválido
    // Pero mejor intentamos ver si existe la tabla 'users' en public (a veces se usa en lugar de profiles)
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (error) {
        console.log('❌ Tabla "users" no encontrada:', error.message);
    } else {
        console.log('✅ Tabla "users" encontrada en el esquema public.');
    }
}

checkTriggers();
