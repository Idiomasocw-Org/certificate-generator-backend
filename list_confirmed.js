import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function list() {
    // Note: We need service role key to list users usually, but let's try with what we have
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error.message);
        return;
    }
    console.log('Confirmed users:');
    users.filter(u => u.email_confirmed_at).forEach(u => console.log(`- ${u.email}`));
}
list();
