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
        const { student_name, course_level, completion_date } = req.body;
        const userId = req.user.sub;

        if (!student_name || !course_level || !completion_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Guardar en Base de Datos (Supabase)
        const { data, error } = await supabase
            .from('certificates_history')
            .insert([{ user_id: userId, student_name, course_level, completion_date }])
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ error: error.message });
        }

        // 2. Generar PDF en Memoria
        console.log('📄 Generando PDF para:', student_name);
        const pdfDoc = await PDFDocument.load(pdfTemplateBuffer);
        pdfDoc.registerFontkit(fontkit);

        // Embeber fuentes
        const oswaldBold = await pdfDoc.embedFont(oswaldBoldBuffer);
        const montserratRegular = await pdfDoc.embedFont(montserratRegularBuffer);

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // --- Dibujar Nombre (Oswald Bold, Grande, Centrado) ---
        const studentNameUpper = student_name.toUpperCase();
        const nameFontSize = 50; // Aumentado para mayor impacto
        const nameWidth = oswaldBold.widthOfTextAtSize(studentNameUpper, nameFontSize);

        firstPage.drawText(studentNameUpper, {
            x: (width - nameWidth) / 2,
            y: height / 2 + 5, // Ajustado según ejemplo visual
            size: nameFontSize,
            font: oswaldBold
        });

        // --- Dibujar Frase de Nivel (Montserrat Regular, Centrada) ---
        const levelText = `Por haber completado con éxito el nivel ${course_level} de Inglés`;
        const levelFontSize = 18;
        const levelWidth = montserratRegular.widthOfTextAtSize(levelText, levelFontSize);

        firstPage.drawText(levelText, {
            x: (width - levelWidth) / 2,
            y: height / 2 - 45, // Ubicado debajo del nombre
            size: levelFontSize,
            font: montserratRegular
        });

        // --- Dibujar Fecha (Montserrat Regular) ---
        // Se mantiene la coordinada X del logo/firma pero ajustamos precisión
        firstPage.drawText(completion_date, {
            x: 125,
            y: 115,
            size: 15,
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
