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

app.use(cors({
    origin: (origin, callback) => {
        const allowed = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://certificate-generator-frontend.vercel.app' // Ejemplo de origen prod
        ];
        if (!origin || allowed.includes(origin) || origin.endsWith('.trycloudflare.com')) {
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
        service: 'Certificate Generator API',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rutas moduladas
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);

app.listen(PORT, () => {
    console.log(`🚀 API ACTUALIZADA Y CORRIENDO EN PUERTO ${PORT} !!!`);
    console.log(`🛡️  Seguridad: RLS Activo, Tokens JWT (HttpOnly), Rate Limiting, Helmet`);
});