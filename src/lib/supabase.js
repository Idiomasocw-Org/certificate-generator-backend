import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔗 Conectando a Supabase:', supabaseUrl);
console.log('🔑 Usando llave:', supabaseKey ? (supabaseKey.substring(0, 10) + '...') : 'FALTA');

export const supabase = createClient(supabaseUrl, supabaseKey);
