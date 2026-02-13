import { supabase } from '../lib/supabase.js';

export const authenticateUser = async (req, res, next) => {
    console.log(`🔍 [AUTH] Verificando token para: ${req.path}`);
    // Intentar obtener el token de cookies primero, luego de Authorization header
    const token = req.cookies.auth_token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

    if (!token) {
        return res.status(401).json({ error: 'No authorization token found' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) throw new Error('Invalid Supabase token');

        req.user = user;
        // console.log('✅ Token verificado para:', user.email);
        next();
    } catch (error) {
        console.error('Auth Error:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const requireAdmin = (req, res, next) => {
    const ADMIN_EMAIL = 'barbaraarias844@gmail.com';

    if (!req.user || !req.user.email) {
        return res.status(403).json({ error: 'Access denied: No user info found' });
    }

    if (req.user.email !== ADMIN_EMAIL) {
        console.warn(`⛔ Acceso denegado: ${req.user.email}`);
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    next();
};