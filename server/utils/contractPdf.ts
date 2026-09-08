import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function base64ToBytes(base64: string): Uint8Array {
  return Buffer.from(base64, 'base64');
}

export async function generateSignedContractPdf(
  signatureDataUrl: string,
  studentName?: string
): Promise<Uint8Array> {
  const pdfPath = path.resolve(__dirname, '..', '..', 'public', 'doc', 'contrat_exacademy.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  const base64Data = signatureDataUrl.split(',')[1];
  const signatureBytes = base64ToBytes(base64Data);

  const pngImage = await pdfDoc.embedPng(signatureBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  const sigWidth = 160;
  const sigHeight = 55;
  const marginLeft = 50;

  lastPage.drawImage(pngImage, {
    x: marginLeft,
    y: 80,
    width: sigWidth,
    height: sigHeight,
  });

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const label = `Signé électroniquement${studentName ? ` par ${studentName}` : ''} le ${dateStr}`;

  lastPage.drawText(label, {
    x: marginLeft + 2,
    y: 150,
    size: 8,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  const modifiedPdfBytes = await pdfDoc.save();
  return modifiedPdfBytes;
}
