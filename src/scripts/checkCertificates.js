import dotenv from 'dotenv';
import { supabase } from '../lib/supabase.js';

dotenv.config();

async function main() {
  try {
    const { data, error } = await supabase
      .from('certificates_history')
      .select('*')
      .eq('student_name', 'Estudiante de Prueba')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase query error:', error);
      process.exit(1);
    }

    console.log('Found rows:', data.length);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

main();
