import '../env';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHttp } from '@prisma/adapter-neon';

const databaseUrl = process.env.DATABASE_URL;

function isNeonHost(url: string): boolean {
  const host = url.replace(/^[a-z]+:\/\/[^:@/]*:[^@]*@/, '').split('/')[0];
  return host.includes('-pooler.') && host.endsWith('.neon.tech');
}

const adapter = databaseUrl && isNeonHost(databaseUrl)
  ? new PrismaNeonHttp(databaseUrl)
  : undefined;

export const prisma = new PrismaClient(
  adapter
    ? { adapter }
    : undefined
);

export default prisma;
