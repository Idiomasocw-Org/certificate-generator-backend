import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestPdf() {
    try {
        console.log('--- Iniciando Prueba de Escritura PDF ---');

        // 1. Cargar archivos
        const assetsPath = path.join(__dirname, '../assets');
        const templateBuffer = fs.readFileSync(path.join(assetsPath, 'templates/certificate-template.pdf'));
        const oswaldBuffer = fs.readFileSync(path.join(assetsPath, 'fonts/Oswald-Bold.ttf'));

        // 2. Crear documento y registrar fontkit
        const pdfDoc = await PDFDocument.load(templateBuffer);
        pdfDoc.registerFontkit(fontkit);

        // 3. Embeber fuente
        const customFont = await pdfDoc.embedFont(oswaldBuffer);

        // 4. Obtener la primera página
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        // 5. Escribir texto de prueba
        // Coordenadas aproximadas para el centro (ajustar según necesidad)
        firstPage.drawText('ESTUDIANTE DE PRUEBA', {
            x: 150,
            y: height / 2 + 10,
            size: 40,
            font: customFont,
            color: rgb(0, 0, 0),
        });

        firstPage.drawText('13 de Enero, 2026', {
            x: 130,
            y: 115,
            size: 15,
            font: customFont,
            color: rgb(0.2, 0.2, 0.2),
        });

        // 6. Guardar el PDF resultante
        const pdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, '../../test-certificate.pdf');
        fs.writeFileSync(outputPath, pdfBytes);

        console.log('✅ Archivo generado con éxito en:', outputPath);
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

createTestPdf();
