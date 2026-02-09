import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const generateCertificatePDF = async (assetsPath, studentName, level, date) => {
    const templatePath = path.join(assetsPath, 'templates/certificate-template.pdf');
    if (!fs.existsSync(templatePath)) throw new Error('Plantilla PDF no encontrada');

    const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
    pdfDoc.registerFontkit(fontkit);

    const getFontBuffer = (fontName) => {
        const fontPath = path.join(assetsPath, 'fonts', fontName);
        return fs.existsSync(fontPath) ? fs.readFileSync(fontPath) : null;
    };

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

    return await pdfDoc.save();
};
