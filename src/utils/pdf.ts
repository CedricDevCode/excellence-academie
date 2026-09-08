import jsPDF from 'jspdf';
import QRCode from 'qrcode';

let logoDataUrl: string | null = null;

async function getLogo(): Promise<string> {
  if (logoDataUrl) return logoDataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 80; c.height = 80;
      c.getContext('2d')!.drawImage(img, 0, 0, 80, 80);
      logoDataUrl = c.toDataURL('image/jpeg');
      resolve(logoDataUrl);
    };
    img.onerror = () => resolve('');
    img.src = '/images/logo%20exacademy.jpeg';
  });
}

function formatPrice(amount: number) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

function numberToWords(n: number): string {
  if (n === 0) return 'zero';
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  function convertBelow1000(num: number): string {
    if (num === 0) return '';
    let result = '';
    const h = Math.floor(num / 100);
    const r = num % 100;
    if (h > 0) result += (h > 1 ? units[h] + ' ' : '') + 'cent ';
    if (r > 0) {
      if (r < 20) result += units[r] + ' ';
      else {
        const d = Math.floor(r / 10);
        const u = r % 10;
        if (d === 7 || d === 9) {
          result += tens[d - 1] + '-' + (d === 7 && u === 1 ? 'et-' : '') + units[10 + u] + ' ';
        } else {
          result += tens[d];
          if (u === 1) result += '-et-un';
          else if (u > 0) result += '-' + units[u];
          result += ' ';
        }
      }
    }
    return result.trim();
  }

  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const remainder = n % 1000;

  let words = '';
  if (millions > 0) words += (millions > 1 ? convertBelow1000(millions) + ' millions ' : 'un million ');
  if (thousands > 0) words += (thousands > 1 ? convertBelow1000(thousands) + ' mille ' : 'mille ');
  words += convertBelow1000(remainder);
  return words.trim() + ' francs CFA';
}

function drawTable(doc: jsPDF, headers: string[], rows: string[][], startY: number, colWidths: number[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const tableWidth = pageWidth - 2 * margin;
  const rowHeight = 9;
  let y = startY;

  // Draw header background
  doc.setFillColor(0, 86, 179);
  doc.rect(margin, y, tableWidth, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let x = margin + 3;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 6);
    x += colWidths[i];
  });

  y += rowHeight;

  // Draw rows
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, tableWidth, rowHeight, 'F');
    }
    doc.rect(margin, y, tableWidth, rowHeight, 'S');
    let cx = margin + 3;
    doc.setFontSize(8);
    row.forEach((cell, ci) => {
      doc.text(cell, cx, y + 6);
      cx += colWidths[ci];
    });
    y += rowHeight;
  });

  return y;
}

export async function generatePaymentReceipt(payment: {
  amount: number; createdAt: string; geniusPayReference?: string; receiptNumber?: string; status: string; type?: string;
}, studentName?: string) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ── Full background ──
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pw, ph, 'F');

  // ── Top header band ──
  doc.setFillColor(0, 86, 179);
  doc.rect(0, 0, pw, 50, 'F');

  // Decorative accent
  doc.setFillColor(255, 107, 0);
  doc.rect(0, 48, pw, 4, 'F');

  // Logo on left
  const logo = await getLogo();
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', margin, 8, 30, 25);
    } catch (_) { /* ignore */ }
  }

  // School info (right of logo)
  const textX = margin + 38;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('EXCELLENCE ACADEMIE', textX, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Formation • Excellence • Reussite', textX, 25);

  doc.setFontSize(8);
  doc.text('RCCM: CI-ABJ-03-2025-B12-01298', textX, 30);

  // ── Receipt title ──
  doc.setTextColor(0, 86, 179);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECU DE PAIEMENT', pw / 2, 72, { align: 'center' });

  // Subtitle line
  doc.setDrawColor(0, 86, 179);
  doc.setLineWidth(0.5);
  doc.line(margin, 77, pw - margin, 77);

  // ── Receipt info line ──
  const dateStr = new Date(payment.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const receiptNum = payment.receiptNumber || `REC-${Date.now()}`;
  const ref = payment.geniusPayReference || 'N/A';

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° Reçu: ${receiptNum}`, margin, 86);
  doc.text(`Date: ${dateStr}`, pw - margin, 86, { align: 'right' });

  // ── Info boxes ──
  let y = 96;

  // Student info box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, pw / 2 - 23, 30, 3, 3, 'FD');
  doc.setTextColor(0, 86, 179);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ETUDIANT', margin + 6, y + 8);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(studentName || '—', margin + 6, y + 20);

  // School info box
  doc.setFillColor(0, 86, 179);
  doc.roundedRect(pw / 2 + 3, y, pw / 2 - 23, 30, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EXCELLENCE ACADEMIE', pw / 2 + 9, y + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Abidjan, Cocody Angre', pw / 2 + 9, y + 18);
  doc.text('Tel: 07 47 43 94 43', pw / 2 + 9, y + 25);

  y += 40;

  // ── Payment details table ──
  const typeLabel = payment.type === 'INSCRIPTION' ? 'Inscription' : 'Mensualite';
  const statusLabel = payment.status === 'SUCCESS' ? 'Paye' : payment.status === 'PENDING' ? 'En attente' : 'Echoue';

  const headers = ['Description', 'Details'];
  const rows = [
    ['Montant paye', formatPrice(payment.amount)],
    ['Type de paiement', typeLabel],
    ['Statut', statusLabel],
    ['Reference transaction', ref],
    ['Date de paiement', dateStr],
  ];
  const colWidths = [60, pw - 2 * margin - 60];

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, pw - 2 * margin, 10 + rows.length * 9, 3, 3, 'F');
  y = drawTable(doc, headers, rows, y, colWidths);

  y += 8;

  // ── Amount in words ──
  doc.setFillColor(0, 86, 179);
  doc.roundedRect(margin, y, pw - 2 * margin, 24, 3, 3, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.roundedRect(margin, y, pw - 2 * margin, 24, 3, 3, 'S');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Arrête la présente quittance à la somme de :', margin + 6, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(payment.amount), margin + 6, y + 19);

  y += 24;

  // ── QR Code ──
  try {
    const qrData = JSON.stringify({
      ref: receiptNum,
      montant: payment.amount,
      date: payment.createdAt,
      status: payment.status,
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 80, margin: 1, color: { dark: '#0056B3' } });
    doc.addImage(qrDataUrl, 'PNG', margin, y - 4, 28, 28);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(5);
    doc.text('Scannez pour verifier', margin, y + 27);
  } catch (_) { }

  // ── Signature area ──
  doc.setDrawColor(200, 200, 200);
  doc.line(pw - margin - 60, y, pw - margin, y);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Cachet et signature', pw - margin - 30, y + 5, { align: 'center' });

  // ── Footer ──
  doc.setFillColor(0, 86, 179);
  doc.rect(0, ph - 18, pw, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Excellence Academie SARL • Abidjan, Cocody Angre • Tel: 07 47 43 94 43 • Email: ea@exacademie.com', pw / 2, ph - 8, { align: 'center' });
  doc.text('Ce recu est generer automatiquement et est valable sans signature.', pw / 2, ph - 3, { align: 'center' });

  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

export function generatePaymentsReport(payments: any[], title: string, filename: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(0, 86, 179);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 22, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const headers = ['Date', 'Etudiant', 'Montant', 'Statut'];
  const rows = payments.map((p: any) => [
    new Date(p.createdAt).toLocaleDateString('fr-FR'),
    p.user?.name || 'Inconnu',
    `${Number(p.amount).toLocaleString('fr-FR')} FCFA`,
    p.status,
  ]);

  const colWidths = [35, 55, 45, 35];
  let y = 50;

  doc.setFillColor(245, 247, 250);
  doc.setFont('helvetica', 'bold');
  let x = 15;
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 4);
    x += colWidths[i];
  });
  doc.setFont('helvetica', 'normal');

  y += 12;
  let total = 0;
  rows.forEach((row) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    let cx = 15;
    row.forEach((cell, ci) => {
      doc.text(String(cell), cx + 2, y + 4);
      cx += colWidths[ci];
    });
    total += Number(row[2]?.replace(/[^0-9]/g, '') || 0);
    y += 10;
  });

  doc.setFont('helvetica', 'bold');
  y += 6;
  doc.text(`Total: ${total.toLocaleString('fr-FR')} FCFA`, 15, y + 4);

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Excellence Academie • Rapport genere automatiquement', pageWidth / 2, 290, { align: 'center' });

  doc.save(filename);
}

export function generateInvoiceReport(data: { totalRevenue: number; totalExpenses: number; netProfit: number; chartData: any[] }, filename: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(0, 86, 179);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport financier', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  let y = 55;

  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

  const items = [
    ['Total Revenus:', fmt(data.totalRevenue)],
    ['Total Depenses:', fmt(data.totalExpenses)],
    ['Resultat net:', fmt(data.netProfit)],
  ];

  items.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 90, y);
    y += 10;
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Evolution mensuelle', 20, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Mois', 20, y);
  doc.text('Revenus', 70, y);
  doc.text('Depenses', 120, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  data.chartData.forEach((d: any) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(d.name || '', 20, y);
    doc.text(fmt(d.Revenus || 0), 70, y);
    doc.text(fmt(d.Depenses || 0), 120, y);
    y += 7;
  });

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Excellence Academie • Rapport genere automatiquement', pageWidth / 2, 290, { align: 'center' });

  doc.save(filename);
}
