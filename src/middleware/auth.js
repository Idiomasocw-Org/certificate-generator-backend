import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

export const authenticateUser = (req, res, next) => {
    // Intentar obtener el token de cookies primero, luego de Authorization header
    const token = req.cookies.auth_token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

    if (!token) {
        return res.status(401).json({ error: 'No authorization token found' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        console.log('✅ Token verificado para:', decoded.email);
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
        console.warn(`⛔ Acceso denegado: ${req.user.email}`);
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    next();
};