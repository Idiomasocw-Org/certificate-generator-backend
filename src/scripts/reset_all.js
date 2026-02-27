import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/barbara/ultime certificate/certificate-generator-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAll() {
    console.log('🔄 Iniciando reseteo completo...');

    // 1. Borrar historial de certificados
    // Nota: Usamos una condición que siempre sea verdadera para borrar todo (si RLS lo permite)
    const { error: dbError } = await supabase
        .from('certificates_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // hack para borrar todo

    if (dbError) {
        console.error('❌ Error al borrar historial:', dbError.message);
    } else {
        console.log('✅ Historial de certificados borrado.');
    }

    // 2. Limpiar Storage
    // Listar archivos en el bucket 'certificates'
    const { data: files, error: listError } = await supabase.storage
        .from('certificates')
        .list();

    if (listError) {
        console.error('❌ Error al listar archivos en storage:', listError.message);
    } else if (files && files.length > 0) {
        const fileNames = files.map(f => f.name);
        // El bucket tiene carpetas por user_id, list() solo lista el nivel superior.
        // Por seguridad, si hay carpetas, habría que borrarlas una por una.
        console.log(`📂 Encontradas carpetas/archivos en root: ${fileNames.join(', ')}`);

        for (const name of fileNames) {
            // Intentamos borrar (si es carpeta requiere recursividad, pero storage.remove acepta paths)
            // Esto es simplificado
            const { error: removeError } = await supabase.storage.from('certificates').remove([name]);
            if (removeError) console.warn(`⚠️ No se pudo borrar ${name} (tal vez es una carpeta no vacía)`);
            else console.log(`✅ Borrado de storage: ${name}`);
        }
    }

    console.log('✨ Reseteo terminado.');
}

resetAll();
