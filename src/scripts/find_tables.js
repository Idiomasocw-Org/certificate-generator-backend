import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/barbara/ultime certificate/certificate-generator-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
    console.log('📡 Buscando todas las tablas en el esquema public...');

    // Intentar leer las tablas usando una vista de sistema si Postgrest lo permite
    // (A veces no está expuesta, pero vale la pena intentar)
    const { data, error } = await supabase
        .from('_tables') // nombre inventado para ver si falla por acceso o por existencia
        .select('*');

    // Intentar buscar una tabla que usualmente existe si hay triggers
    const tablesToTry = ['profiles', 'users', 'teachers', 'docentes', 'user_profiles', 'accounts'];

    for (const table of tablesToTry) {
        const { error: err } = await supabase.from(table).select('*').limit(1);
        if (!err) {
            console.log(`✅ ¡Encontrada!: ${table}`);
        } else if (err.code !== '42P01') { // 42P01 es 'undefined_table'
            console.log(`❓ La tabla "${table}" parece existir pero dio otro error: ${err.message} (${err.code})`);
        }
    }
}

checkAllTables();
