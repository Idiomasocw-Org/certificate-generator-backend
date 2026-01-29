import { jwtVerify, createRemoteJWKSet } from 'jose';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

// Configuración del set de llaves remotas de Supabase
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            clockTolerance: '60s' 
        });

        console.log('✅ Token verificado para:', payload.email);
        req.user = payload; // Adjuntamos el usuario a la request
        next();
    } catch (error) {
        console.error('--- Auth Error Detail ---');
        console.error('Message:', error.message);
        return res.status(401).json({
            error: 'Invalid or expired token',
            details: error.message
        });
    }
};

export const requireAdmin = (req, res, next) => {
    const ADMIN_EMAIL = 'barbaraarias844@gmail.com';

    if (!req.user || !req.user.email) {
        return res.status(403).json({ error: 'Access denied: No user info found' });
    }

    if (req.user.email !== ADMIN_EMAIL) {
        console.warn(`⛔ Acceso denegado a historial para: ${req.user.email}`);
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    next();
};