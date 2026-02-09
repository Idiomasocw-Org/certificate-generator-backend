import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { generateCertificatePDF } from '../lib/pdf.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');
const assetsPath = fs.existsSync(path.join(__dirname, '../assets'))
    ? path.join(__dirname, '../assets')
    : path.join(projectRoot, 'assets');

const router = express.Router();

const CertificateSchema = z.object({
    studentName: z.string().min(3),
    level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

router.get('/', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('certificates_history')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticateUser, async (req, res) => {
    try {
        const validated = CertificateSchema.parse(req.body);
        const { studentName, level, date } = validated;

        // 1. Guardar en Supabase
        const { error: dbError } = await supabase
            .from('certificates_history')
            .insert([{
                user_id: req.user.id,
                student_name: studentName,
                course_level: level,
                completion_date: date
            }]);

        if (dbError) throw dbError;

        // 2. Generar PDF
        const pdfBytes = await generateCertificatePDF(assetsPath, studentName, level, date);

        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        const errorMessage = err.name === 'ZodError'
            ? 'Datos inválidos: ' + err.errors.map(e => `${e.path}: ${e.message}`).join(', ')
            : err.message;
        res.status(400).json({ error: errorMessage });
    }
});

export default router;
