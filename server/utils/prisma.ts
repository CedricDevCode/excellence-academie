import '../env';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;

// Détection Neon : le pooler Neon nécessite pgbouncer=true + connection_limit=1
function isNeonHost(url: string): boolean {
  const host = url.replace(/^[a-z]+:\/\/[^:@/]*:[^@]*@/, '').split('/')[0];
  return host.includes('-pooler.') && host.endsWith('.neon.tech');
}

function buildAdapter(dbUrl: string): PrismaPg {
  if (isNeonHost(dbUrl)) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    return new PrismaPg(pool);
  }
  return new PrismaPg({ connectionString: dbUrl });
}

const adapter = databaseUrl ? buildAdapter(databaseUrl) : undefined;

export const prisma = new PrismaClient(
  adapter
    ? { adapter }
    : undefined
);

export default prisma;
