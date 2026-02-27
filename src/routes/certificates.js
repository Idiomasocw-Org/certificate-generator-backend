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
    console.log('🚀 POST /api/certificates - Petición recibida');
    try {
        const validated = CertificateSchema.parse(req.body);
        const { studentName, level, date } = validated;

        // 1. Generar PDF primero
        const pdfBytes = await generateCertificatePDF(assetsPath, studentName, level, date);
        const fileName = `${req.user.id}/${Date.now()}_${studentName.replace(/\s+/g, '_')}.pdf`;

        // 2. Subir a Supabase Storage
        // Intentamos subirlo al bucket 'certificates'. 
        // Nota: Asegúrate de que el bucket sea PÚBLICO o tenga políticas RLS adecuadas.
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('certificates')
            .upload(fileName, pdfBytes, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            console.error('❌ Error al subir a Storage:', uploadError);
            // Si falla el storage, igual intentamos guardar en DB o avisar
        }

        // 3. Guardar en Base de Datos (con el path del archivo)
        const { error: dbError } = await supabase
            .from('certificates_history')
            .insert([{
                user_id: req.user.id,
                student_name: studentName,
                course_level: level,
                completion_date: date,
                storage_path: fileName
            }]);

        if (dbError) {
            console.error('❌ Error de base de datos:', dbError);
            throw dbError;
        }

        // 4. Enviar PDF para descarga inmediata con nombre limpio
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${studentName.replace(/\s+/g, '_')}.pdf"`);
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        const errorMessage = err.name === 'ZodError'
            ? 'Datos inválidos: ' + err.errors.map(e => `${e.path}: ${e.message}`).join(', ')
            : err.message;
        res.status(400).json({ error: errorMessage });
    }
});

// Nuevo endpoint para obtener la URL de descarga de un certificado guardado
router.get('/:id/download', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('certificates_history')
            .select('storage_path, user_id, student_name')
            .eq('id', req.params.id)
            .single();

        if (error || !data) throw new Error('Certificado no encontrado');
        if (data.user_id !== req.user.id) return res.status(403).json({ error: 'No tienes permiso' });

        const { data: urlData } = await supabase.storage
            .from('certificates')
            .createSignedUrl(data.storage_path, 60, {
                download: `${data.student_name.replace(/\s+/g, '_')}.pdf`
            }); // URL válida por 60 segundos con nombre sugerido

        if (!urlData) throw new Error('No se pudo generar el enlace de descarga');

        res.json({ url: urlData.signedUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
