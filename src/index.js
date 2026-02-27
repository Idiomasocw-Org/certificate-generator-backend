import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import certificateRoutes from './routes/certificates.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { validateEnv } from './lib/validateEnv.js';

dotenv.config();
validateEnv(); // Validate environment variables before starting server

const app = express();
app.set('trust proxy', 1); // Confía en proxies como Cloudflare para obtener la IP real
const PORT = process.env.PORT || 3000;

const whiteList = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // En desarrollo, permitimos peticiones sin origen (como Postman o apps móviles)
        // y orígenes locales o dominios de Cloudflare Tunnel.
        const isCloudflare = origin && origin.endsWith('.trycloudflare.com');
        const isLocal = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));

        if (!origin || whiteList.includes(origin) || isCloudflare || isLocal || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn(`🔒 CORS bloqueado para el origen: ${origin}`);
            callback(new Error('CORS Blocked by security policy'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

app.use(express.json());
app.use(cookieParser());
app.use(helmet()); // Basic Security headers (XSS, Clickjacking, MIME sniff)
app.use(globalLimiter); // Apply default rate limiting to all requests

app.get('/', (req, res) => {
    res.json({
        status: 'UP',
        service: 'Certificate Generator API'
    });
});

// Rutas moduladas
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);

// Manejador global de errores — Evita que se filtren detalles internos
app.use((err, req, res, next) => {
    console.error('🔥 Error no controlado:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API CORRIENDO EN: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
    console.log(`🛡️  Seguridad: RLS Activo, Tokens JWT (HttpOnly), Rate Limiting, Helmet`);
});