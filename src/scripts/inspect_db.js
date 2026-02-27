import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/barbara/ultime certificate/certificate-generator-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
    console.log('🔍 Inspeccionando tablas públicas...');

    // Consultar lista de tablas vía rpc si existe o vía query directa a la API de postgrest
    // Intentaremos leer certificates_history primero para ver si responde
    const { data: tables, error: tablesError } = await supabase
        .from('certificates_history')
        .select('*')
        .limit(1);

    if (tablesError) {
        console.error('❌ Error al acceder a certificates_history:', tablesError.message);
    } else {
        console.log('✅ Acceso a certificates_history OK.');
    }

    // Intentar ver si existe una tabla de perfiles/usuarios
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (profilesError) {
        console.log('ℹ️ Tabla "profiles" no encontrada o inaccesible:', profilesError.message);
    } else {
        console.log('✅ Tabla "profiles" encontrada.');
    }

    const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .limit(1);

    if (teachersError) {
        console.log('ℹ️ Tabla "teachers" no encontrada o inaccesible:', teachersError.message);
    } else {
        console.log('✅ Tabla "teachers" encontrada.');
    }
}

inspectDatabase();
