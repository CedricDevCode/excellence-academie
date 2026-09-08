require('dotenv').config({ path: 'C:/Users/Lenovo/Downloads/excellence-acadmie-landing-page/.env' });
const { PrismaClient } = require('C:/Users/Lenovo/Downloads/excellence-acadmie-landing-page/node_modules/@prisma/client');
const bcrypt = require('C:/Users/Lenovo/Downloads/excellence-acadmie-landing-page/node_modules/bcrypt');

(async () => {
  const p = new PrismaClient();
  try {
    const users = await p.user.findMany({ select: { email: true, role: true, isActive: true, password: true } });
    console.log('USERS IN DB:', users.length);
    for (const u of users) {
      const match = await bcrypt.compare('password123', u.password);
      console.log(`${u.email} | role=${u.role} | active=${u.isActive} | password=password123: ${match}`);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
