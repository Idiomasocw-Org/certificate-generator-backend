import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateUser } from './middleware/auth.js';
import { supabase } from './lib/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { z } from 'zod';

// Esquema de validación Zod (Fase 5 - Seguridad)
const CertificateSchema = z.object({
    studentName: z.string().min(3),
    level: z.string().min(2),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
});

dotenv.config();

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client imported from lib
// --- PDF ASSETS LOADING ---
let pdfTemplateBuffer;
let oswaldBoldBuffer;
let montserratBoldBuffer;
let montserratRegularBuffer;

try {
    const assetsPath = path.join(__dirname, 'assets');
    pdfTemplateBuffer = fs.readFileSync(path.join(assetsPath, 'templates/certificate-template.pdf'));
    oswaldBoldBuffer = fs.readFileSync(path.join(assetsPath, 'fonts/Oswald-Bold.ttf'));
    montserratBoldBuffer = fs.readFileSync(path.join(assetsPath, 'fonts/Montserrat-Bold.ttf'));
    montserratRegularBuffer = fs.readFileSync(path.join(assetsPath, 'fonts/Montserrat-Regular.ttf'));

    console.log('✅ PDF Template loaded:', pdfTemplateBuffer.length, 'bytes');
    console.log('✅ Fonts loaded: Oswald-Bold, Montserrat-Bold, Montserrat-Regular');
} catch (error) {
    console.error('❌ Error loading PDF assets:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API Running');
});

// Ruta para obtener el historial de certificados del usuario
app.get('/api/certificates', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.sub;

        const { data, error } = await supabase
            .from('certificates_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Ruta protegida de prueba
app.get('/protected', authenticateUser, (req, res) => {
    res.json({
        message: 'Acceso autorizado',
        user: req.user
    });
});

// Ruta para guardar certificado y generar PDF
app.post('/api/certificates', authenticateUser, async (req, res) => {
    try {
        // Validación de datos con Zod (Fase 5 - Seguridad)
        let validatedData;
        try {
            validatedData = CertificateSchema.parse(req.body);
        } catch (validationError) {
            console.error('❌ Validation Error:', validationError.errors);
            return res.status(400).json({
                error: 'Datos inválidos',
                details: validationError.errors
            });
        }

        const { studentName, level, date } = validatedData;
        const userId = req.user.sub;

        // 1. Guardar en Base de Datos (Supabase)
        const { data, error } = await supabase
            .from('certificates_history')
            .insert([{ user_id: userId, student_name: studentName, course_level: level, completion_date: date }])
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ error: error.message });
        }

        // 2. Generar PDF en Memoria
        console.log('📄 Generando PDF para:', studentName);
        const pdfDoc = await PDFDocument.load(pdfTemplateBuffer);
        pdfDoc.registerFontkit(fontkit);

        // Embeber fuentes
        const oswaldBold = await pdfDoc.embedFont(oswaldBoldBuffer);
        const montserratRegular = await pdfDoc.embedFont(montserratRegularBuffer);

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // CÁLCULO DE CENTRO VISUAL
        // El diseño tiene una barra lateral izquierda. Estimamos un offset para encontrar el centro de la zona "blanca".
        // La flecha del usuario indica mover a la izquierda. Usamos un valor negativo fuerte.
        const visualCenterXOffset = -60;
        const effectiveCenterOnPage = (width / 2) + visualCenterXOffset;

        // --- Dibujar Nombre (Oswald Bold, Ajustado) ---
        const studentNameUpper = studentName.toUpperCase();
        let nameFontSize = 36;
        let nameWidth = oswaldBold.widthOfTextAtSize(studentNameUpper, nameFontSize);

        // Límite de ancho (reducido drásticamente para asegurar que no toque el sello)
        // 0.35 es seguro para que nameWidth/2 no invada el espacio del sello a la derecha
        const maxNameWidth = width * 0.35;

        // Ajuste dinámico de fuente
        while (nameWidth > maxNameWidth && nameFontSize > 10) {
            nameFontSize -= 2;
            nameWidth = oswaldBold.widthOfTextAtSize(studentNameUpper, nameFontSize);
        }

        firstPage.drawText(studentNameUpper, {
            x: effectiveCenterOnPage - (nameWidth / 2),
            y: height / 2 - 10,
            size: nameFontSize,
            font: oswaldBold
        });

        // --- Dibujar Nivel (Montserrat Regular, Solo Dato) ---
        // Eliminamos el texto "For successfully completing..." que el usuario rechazó.
        // Ponemos solo el nivel o "Nivel: X"
        const levelText = level; // Opción minimalista
        const levelFontSize = 14;
        const levelWidth = montserratRegular.widthOfTextAtSize(levelText, levelFontSize);

        firstPage.drawText(levelText, {
            x: effectiveCenterOnPage - (levelWidth / 2),
            y: height / 2 - 40,
            size: levelFontSize,
            font: montserratRegular
        });

        // --- Dibujar Fecha (Montserrat Regular, Pequeña) ---
        const dateFontSize = 12; // Tamaño reducido como se sugirió
        firstPage.drawText(date, {
            x: 130,
            y: 118,
            size: dateFontSize,
            font: montserratRegular
        });

        const pdfBytes = await pdfDoc.save();

        // 3. Opcional: Guardar copia local y responder con el PDF binario
        const outputDir = path.join(__dirname, '../generated_certificates');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        const fileName = `certificate_${data[0].id}.pdf`;
        fs.writeFileSync(path.join(outputDir, fileName), pdfBytes);

        // Responder con el PDF directamente
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(Buffer.from(pdfBytes));

        console.log('✅ Certificado enviado al cliente:', fileName);

    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
