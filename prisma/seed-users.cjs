const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@excellence.ci', name: 'Administrateur', role: 'ADMIN' },
    { email: 'accountant@excellence.ci', name: 'Comptable', role: 'ACCOUNTANT' },
    { email: 'teacher@excellence.ci', name: 'Enseignant', role: 'TEACHER' },
    { email: 'student@excellence.ci', name: 'Étudiant Test', role: 'STUDENT' },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      // Update password in case it was wrong
      await prisma.user.update({
        where: { email: u.email },
        data: { password, name: u.name, role: u.role },
      });
      console.log(`Updated: ${u.email} (${u.role})`);
    } else {
      await prisma.user.create({
        data: { email: u.email, password, name: u.name, role: u.role },
      });
      console.log(`Created: ${u.email} (${u.role})`);
    }
  }

  console.log('\nAll users ready! Password: password123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
