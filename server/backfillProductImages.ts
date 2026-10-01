import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './utils/prisma';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** Les anciens uploads pouvaient atterrir à plusieurs endroits selon le cwd. */
function candidateDirs(): string[] {
  const cwd = process.cwd();
  return [
    path.resolve(cwd, 'uploads', 'products'),
    path.resolve(cwd, 'server', 'uploads', 'products'),
    path.resolve(__dirname, 'uploads', 'products'),
    path.resolve(__dirname, '..', 'uploads', 'products'),
  ];
}

function findOnDisk(filename: string): string | null {
  for (const dir of candidateDirs()) {
    const full = path.join(dir, filename);
    // path.basename plus haut : jamais de traversal hors du dossier
    if (path.dirname(full) !== path.resolve(dir)) continue;
    try {
      if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function parseEntries(imageUrl: string): { entries: string[]; isArray: boolean } {
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return { entries: parsed.filter((e): e is string => typeof e === 'string'), isArray: true };
      }
    } catch {
      /* contenu cassé → traité comme URL unique */
    }
  }
  return { entries: [trimmed], isArray: false };
}

/**
 * Migre les images produit encore stockées sur disque (`/uploads/products/…`)
 * vers la table ProductImage.
 *
 * Idempotent : seuls les produits dont imageUrl référence encore un fichier
 * disque sont touchés ; si le fichier n'existe plus (redéploiement Hostinger,
 * disque éphémère), l'URL est laissée telle quelle.
 */
export async function backfillProductImages(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });

  let migrated = 0;
  for (const product of products) {
    const raw = product.imageUrl;
    if (!raw) continue;

    const { entries, isArray } = parseEntries(raw);
    const newEntries: string[] = [];
    let changed = false;

    for (const entry of entries) {
      const match = entry.match(/^\/uploads\/products\/([^/]+)$/);
      if (!match) {
        newEntries.push(entry);
        continue;
      }

      const filename = path.basename(match[1]);
      const file = findOnDisk(filename);
      if (!file) {
        // Fichier déjà perdu : on laisse l'URL (aucun effet de bord)
        newEntries.push(entry);
        continue;
      }

      try {
        const data = fs.readFileSync(file);
        if (!data.length) {
          newEntries.push(entry);
          continue;
        }
        const ext = path.extname(filename).toLowerCase();
        const image = await prisma.productImage.create({
          data: {
            productId: product.id,
            data,
            mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
            size: data.length,
          },
        });
        newEntries.push(`/media/product-images/${image.id}`);
        changed = true;
        migrated++;
      } catch (err: any) {
        console.warn(`⚠️ [BackfillImages] ${filename} :`, err?.message || err);
        newEntries.push(entry);
      }
    }

    if (changed) {
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: isArray ? JSON.stringify(newEntries) : (newEntries[0] ?? null) },
      });
    }
  }

  if (migrated > 0) {
    console.log(`✅ ${migrated} image(s) produit migrée(s) du disque vers la base`);
  }
}
