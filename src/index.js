import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateUser } from './middleware/auth.js';
import { supabase } from './lib/supabase.js';

dotenv.config();
// Supabase client imported from lib

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

// Ruta para guardar certificado
app.post('/api/certificates', authenticateUser, async (req, res) => {
    try {
        const { student_name, course_level, completion_date } = req.body;
        const userId = req.user.sub; // ID del usuario obtenido del token

        if (!student_name || !course_level || !completion_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('certificates_history')
            .insert([
                {
                    user_id: userId,
                    student_name,
                    course_level,
                    completion_date
                }
            ])
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
