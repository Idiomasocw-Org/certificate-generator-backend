import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
    SUPABASE_URL: z.string().url('SUPABASE_URL debe ser una URL válida'),
    SUPABASE_KEY: z.string().min(1, 'SUPABASE_KEY es requerida'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres para ser segura'),
    RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY debe comenzar con "re_"'),
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida (ej: http://localhost:5173 o la URL de Cloudflare)').optional(),
});

export function validateEnv() {
    try {
        const validation = envSchema.safeParse(process.env);

        if (!validation.success) {
            console.error('❌ ERROR: Variables de entorno inválidas o faltantes:');
            validation.error.errors.forEach(err => {
                console.error(`   - ${err.path.join('.')}: ${err.message}`);
            });
            console.error('\n💡 Verifica tu archivo .env y asegúrate de que todas las variables estén configuradas correctamente.');
            process.exit(1);
        }

        console.log('✅ Variables de entorno validadas correctamente');
        return validation.data;
    } catch (error) {
        console.error('❌ Error fatal al validar variables de entorno:', error);
        process.exit(1);
    }
}
