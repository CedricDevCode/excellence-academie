import prisma from './prisma';

export function generateReceiptNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REC-${y}${m}${d}-${rand}`;
}

export async function generateMatricule(): Promise<string> {
  const year = new Date().getFullYear().toString();
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const last = await prisma.user.findFirst({
      where: { matricule: { startsWith: `EA-${year}-` } },
      orderBy: { matricule: 'desc' },
      select: { matricule: true },
    });
    let next = 1;
    if (last?.matricule) {
      const parts = last.matricule.split('-');
      next = parseInt(parts[2], 10) + 1 + attempt;
    }
    const matricule = `EA-${year}-${String(next).padStart(4, '0')}`;
    // Le UNIQUE constraint sur matricule casse la boucle en cas de doublon
    try {
      await prisma.user.findFirst({ where: { matricule }, select: { id: true } });
      // Si pas d'erreur, le matricule est unique
      return matricule;
    } catch {
      continue;
    }
  }
  // Fallback : laisser Prisma gérer l'erreur UNIQUE
  const last = await prisma.user.findFirst({
    where: { matricule: { startsWith: `EA-${year}-` } },
    orderBy: { matricule: 'desc' },
    select: { matricule: true },
  });
  let next = 1;
  if (last?.matricule) {
    const parts = last.matricule.split('-');
    next = parseInt(parts[2], 10) + 1;
  }
  return `EA-${year}-${String(next).padStart(4, '0')}`;
}
