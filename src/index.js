import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateUser } from './middleware/auth.js';
import { supabase, getSupabaseUserClient } from './lib/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { z } from 'zod';

// Esquema de validación Zod
const CertificateSchema = z.object({
    studentName: z.string().min(3),
    level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const assetsPath = fs.existsSync(path.join(__dirname, 'assets'))
    ? path.join(__dirname, 'assets')
    : path.join(projectRoot, 'assets');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS Robusta para Cloudflare
app.use(cors({
    origin: (origin, callback) => {
        const allowed = ['http://localhost:5173', 'http://localhost:3000'];
        if (!origin || allowed.includes(origin) || origin.endsWith('.trycloudflare.com')) {
            callback(null, true);
        } else {
            callback(new Error('CORS Blocked'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Función para cargar fuentes
const getFontBuffer = (fontName) => {
    const fontPath = path.join(assetsPath, 'fonts', fontName);
    return fs.existsSync(fontPath) ? fs.readFileSync(fontPath) : null;
};

// --- RUTAS ACTUALIZADAS CON SOPORTE RLS ---

app.get('/api/certificates', authenticateUser, async (req, res) => {
    try {
        // Obtenemos el token del header para el cliente autenticado
        const token = req.headers.authorization.split(' ')[1];
        const userClient = getSupabaseUserClient(token);

        const { data, error } = await userClient
            .from('certificates_history')
            .select('*')
            .eq('user_id', req.user.sub)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('❌ Error fetching history:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/certificates', authenticateUser, async (req, res) => {
    try {
        console.log('📥 Petición recibida:', req.body);
        const validated = CertificateSchema.parse(req.body);
        const { studentName, level, date } = validated;

        // 1. Obtener token y crear cliente con rol "authenticated"
        const token = req.headers.authorization.split(' ')[1];
        const userClient = getSupabaseUserClient(token);

        // 2. Guardar en Supabase usando el cliente que cumple la política RLS
        const { error: dbError } = await userClient
            .from('certificates_history')
            .insert([{
                user_id: req.user.sub,
                student_name: studentName,
                course_level: level,
                completion_date: date
            }]);

        if (dbError) throw dbError;

        // --- LÓGICA DE GENERACIÓN DE PDF (Mantenida exactamente igual) ---
        const templatePath = path.join(assetsPath, 'templates/certificate-template.pdf');
        if (!fs.existsSync(templatePath)) throw new Error('Plantilla PDF no encontrada');

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        pdfDoc.registerFontkit(fontkit);

        const boldBuffer = getFontBuffer('Montserrat-Bold.ttf');
        const regularBuffer = getFontBuffer('Montserrat-Regular.ttf');
        const italicBuffer = getFontBuffer('Montserrat-LightItalic.ttf');
        const oswaldBuffer = getFontBuffer('Oswald-Bold.ttf');

        const fontBold = boldBuffer ? await pdfDoc.embedFont(boldBuffer) : await pdfDoc.embedStandardFont('Helvetica-Bold');
        const fontRegular = regularBuffer ? await pdfDoc.embedFont(regularBuffer) : await pdfDoc.embedStandardFont('Helvetica');
        const fontItalic = italicBuffer ? await pdfDoc.embedFont(italicBuffer) : fontRegular;
        const fontOswald = oswaldBuffer ? await pdfDoc.embedFont(oswaldBuffer) : fontBold;

        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();

        const config = {
            x: 95,
            xDate: 95,
            nameY: height / 2 + 40,
            lineHeight: 62,
            dateY: 108,
            maxWidth: 420,
            baseSize: 42,
            levelSize: 11,
            dateSize: 11
        };

        const words = studentName.trim().split(/\s+/);
        let firstName = "";
        let lastName = "";

        if (words.length >= 4) {
            firstName = `${words[0]} ${words[1]}`.toUpperCase();
            lastName = words.slice(2).join(' ').toUpperCase();
        } else if (words.length === 3) {
            firstName = words[0].toUpperCase();
            lastName = `${words[1]} ${words[2]}`.toUpperCase();
        } else {
            firstName = words[0].toUpperCase();
            lastName = words.slice(1).join(' ').toUpperCase();
        }

        const getFontSize = (text) => {
            const width = fontOswald.widthOfTextAtSize(text, config.baseSize);
            return width > config.maxWidth ? (config.maxWidth / width) * config.baseSize : config.baseSize;
        };

        page.drawText(firstName, {
            x: config.x,
            y: config.nameY,
            size: getFontSize(firstName),
            font: fontOswald,
            color: rgb(0.05, 0.1, 0.2)
        });

        if (lastName) {
            page.drawText(lastName, {
                x: config.x,
                y: config.nameY - config.lineHeight,
                size: getFontSize(lastName),
                font: fontOswald,
                color: rgb(0.05, 0.1, 0.2)
            });
        }

        page.drawText(`For successfully completing and passing the ${level} level of English`, {
            x: config.x,
            y: config.nameY - config.lineHeight - 38,
            size: config.levelSize,
            font: fontItalic,
            color: rgb(0.5, 0.5, 0.5)
        });

        const [year, month, day] = date.split('-');
        page.drawText(`${day}/${month}/${year}`, {
            x: config.xDate,
            y: config.dateY,
            size: config.dateSize,
            font: fontRegular,
            color: rgb(0.5, 0.5, 0.5)
        });

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (err) {
        console.error('❌ Error generating certificate:', err);
        const errorMessage = err.name === 'ZodError'
            ? 'Datos inválidos: ' + err.errors.map(e => `${e.path}: ${e.message}`).join(', ')
            : err.message;
        res.status(400).json({ error: errorMessage });
    }
});

app.listen(PORT, () => console.log(`🚀 Server en puerto ${PORT}`));