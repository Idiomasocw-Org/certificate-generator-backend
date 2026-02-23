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
const PORT = process.env.PORT || 3000;

// ⚠️ IMPORTANTE: Cuando despliegues el frontend, reemplaza la URL de ejemplo
// con la URL REAL de tu frontend en producción (ej: https://tu-app.vercel.app)
app.use(cors({
    origin: (origin, callback) => {
        const allowed = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            process.env.FRONTEND_URL, // URL del frontend en producción
        ].filter(Boolean);
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS Blocked'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
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

app.listen(PORT, () => {
    console.log(`🚀 API CORRIENDO EN PUERTO ${PORT}`);
    console.log(`🛡️  Seguridad: RLS Activo, Tokens JWT (HttpOnly), Rate Limiting, Helmet`);
});