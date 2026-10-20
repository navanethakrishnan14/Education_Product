import bcrypt from 'bcryptjs'
import { prisma } from './lib/prisma'
async function main(): Promise<void> {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.PLATFORM_ADMIN_PASSWORD
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() || 'EduSphere Platform Admin'
  if (!email || !password) throw new Error('Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD before running npm run db:seed.')
  if (password.length < 12) throw new Error('PLATFORM_ADMIN_PASSWORD must be at least 12 characters.')
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.platformUser.upsert({
    where: { email },
    update: { name, passwordHash, role: 'platform_admin', isActive: true },
    create: { name, email, passwordHash, role: 'platform_admin', isActive: true },
  })
  console.log(`Platform administrator seeded: ${email}`)
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })