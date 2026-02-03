import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔗 Conectando a Supabase:', supabaseUrl);
console.log('🔑 Usando llave:', supabaseKey ? (supabaseKey.substring(0, 10) + '...') : 'FALTA');

// Cliente base para autenticación y operaciones generales
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Crea un cliente de Supabase que utiliza el token del usuario logueado.
 * Esto es lo que permite que la política RLS "TO authenticated" funcione.
 */
export const getSupabaseUserClient = (token) => {
    return createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
};