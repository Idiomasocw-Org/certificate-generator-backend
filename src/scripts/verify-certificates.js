import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestCertificate(studentName, level, date, filename) {
    try {
        const assetsPath = path.join(__dirname, '../assets');
        const templatePath = path.join(assetsPath, 'templates/certificate-template.pdf');

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Plantilla no encontrada en: ${templatePath}`);
        }

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        pdfDoc.registerFontkit(fontkit);

        const oswaldBuffer = fs.readFileSync(path.join(assetsPath, 'fonts/Oswald-Bold.ttf'));
        const regularBuffer = fs.readFileSync(path.join(assetsPath, 'fonts/Montserrat-Regular.ttf'));
        const italicBuffer = fs.readFileSync(path.join(assetsPath, 'fonts/Montserrat-LightItalic.ttf'));

        const fontOswald = await pdfDoc.embedFont(oswaldBuffer);
        const fontRegular = await pdfDoc.embedFont(regularBuffer);
        const fontItalic = await pdfDoc.embedFont(italicBuffer);

        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();

        // --- LÓGICA COPIADA DE INDEX.JS ---
        const config = {
            x: 105,
            maxWidth: 420,
            baseSize: 60,
            nameY: height / 2 + 50
        };

        const nameText = studentName.toLowerCase();
        const textWidth = fontOswald.widthOfTextAtSize(nameText, config.baseSize);
        let finalSize = config.baseSize;

        if (textWidth > config.maxWidth) {
            finalSize = (config.maxWidth / textWidth) * config.baseSize;
        }

        page.drawText(nameText, {
            x: config.x,
            y: config.nameY,
            size: finalSize,
            font: fontOswald,
            color: rgb(0.05, 0.1, 0.2)
        });

        page.drawText(`For successfully completing and passing the ${level} level of English`, {
            x: config.x,
            y: height / 2 - 35,
            size: 16,
            font: fontItalic,
            color: rgb(0.4, 0.4, 0.4)
        });

        const [year, month, day] = date.split('-');
        page.drawText(`${day}/${month}/${year}`, {
            x: config.x,
            y: 118,
            size: 13,
            font: fontRegular,
            color: rgb(0, 0, 0)
        });
        // --- FIN DE LÓGICA ---

        const pdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, `../../${filename}`);
        fs.writeFileSync(outputPath, pdfBytes);
        console.log(`✅ Certificado generado: ${filename} (Nombre: "${studentName}", Tamaño: ${finalSize.toFixed(1)})`);
    } catch (error) {
        console.error(`❌ Error generando ${filename}:`, error.message);
    }
}

async function runTests() {
    console.log('--- Iniciando Pruebas de Certificados ---');

    // Prueba 1: Nombre Corto
    await generateTestCertificate('Barbie Kim', 'A1', '2026-01-27', 'test-short.pdf');

    // Prueba 2: Nombre Mediano
    await generateTestCertificate('Barbara Andrea Arias', 'B1', '2026-01-27', 'test-medium.pdf');

    // Prueba 3: Nombre Muy Largo (Auto-Escala)
    await generateTestCertificate('Barbara Andrea Arias Buroz de la Santisima Trinidad', 'C1', '2026-01-27', 'test-long.pdf');

    console.log('--- Pruebas Finalizadas ---');
    console.log('Por favor, revisa la raíz del proyecto para ver los archivos .pdf generados.');
}

runTests();
