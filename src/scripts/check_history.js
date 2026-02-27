import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/barbara/ultime certificate/certificate-generator-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('👥 Consultando usuarios en Supabase Auth...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error reading users:', error.message);
    } else {
        console.log(`👤 Encontrados ${users.length} usuarios.`);
        users.forEach(u => {
            console.log(`- ${u.email} [ID: ${u.id}] [Verificado: ${!!u.email_confirmed_at}]`);
        });
    }
}

checkUsers();
