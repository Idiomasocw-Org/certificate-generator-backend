import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateUser } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({
    origin: 'http://localhost:5173'
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API Running');
});

// Ruta protegida de prueba
app.get('/protected', authenticateUser, (req, res) => {
    res.json({
        message: 'Acceso autorizado',
        user: req.user
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
