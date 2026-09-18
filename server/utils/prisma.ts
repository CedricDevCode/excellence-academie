import '../env';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

// Neon utilise un point de terminaison poolé (nom d'hôte *-pooler.neon.tech).
// Sans `pgbouncer=true`, Prisma garde chaque connexion en session pooling : elles
// se bloquent côté Neon et le pool de 5 connexions s'épuise rapidement
// ("Timed out fetching a new connection from the connection pool").
function buildPrismaUrl(url: string): string {
  const host = url.replace(/^[a-z]+:\/\/[^:@/]*:[^@]*@/, '').split('/')[0];
  const needsPgbouncer = host.includes('-pooler.') && host.endsWith('.neon.tech');
  if (!needsPgbouncer) return url;

  const hasQuery = url.includes('?');
  const params = new URLSearchParams(
    Object.fromEntries(
      hasQuery
        ? [...new URLSearchParams(url.split('?')[1]).entries()]
        : []
    )
  );
  params.set('pgbouncer', 'true');
  params.set('connection_limit', '1');
  params.set('pool_timeout', '30');

  const [base] = url.split('?');
  return `${base}?${params.toString()}`;
}

const prismaUrl = databaseUrl ? buildPrismaUrl(databaseUrl) : undefined;

export const prisma = new PrismaClient(
  prismaUrl
    ? {
        datasources: {
          db: {
            url: prismaUrl,
          },
        },
      }
    : undefined
);

export default prisma;
