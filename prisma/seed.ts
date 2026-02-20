import { PrismaPg } from '@prisma/adapter-pg'
import { $Enums, Prisma, PrismaClient } from '@prismaclient/client'
import 'dotenv/config'
import { genSaltSync, hashSync } from 'bcryptjs'
import { buildDatabaseUrl } from '@src/database/database-url'
import { AUTH_CONFIG } from '@src/modules/auth/auth.config'

const pool = new PrismaPg({ connectionString: buildDatabaseUrl() })
const prisma = new PrismaClient({ adapter: pool })

const userData: Prisma.UserCreateInput[] = [
  {
    id: '1',
    email: 'admin@admin.com',
    password: hashSync(
      'Test12345!',
      genSaltSync(AUTH_CONFIG.PASSWORD.BCRYPT_SALT_ROUNDS),
    ),
    fullName: 'Admin',
    role: $Enums.Role.tenant_admin,
    isActive: true,
    createdAt: new Date(),
    createdBy: 'seeder',
    updatedAt: new Date(),
    updatedBy: 'seeder',
    tenant: {
      create: {
        id: '1',
        name: 'Tenant',
        code: 'TNT-01',
        createdAt: new Date(),
        createdBy: 'seeder',
        updatedAt: new Date(),
        updatedBy: 'seeder',
      },
    },
  },
  {
    id: '2',
    email: 'officer@admin.com',
    password: hashSync(
      'Test12345!',
      genSaltSync(AUTH_CONFIG.PASSWORD.BCRYPT_SALT_ROUNDS),
    ),
    fullName: 'Officer',
    role: $Enums.Role.payroll_officer,
    isActive: true,
    createdAt: new Date(),
    createdBy: 'seeder',
    updatedAt: new Date(),
    updatedBy: 'seeder',
    tenant: { connect: { id: '1' } },
  },
  {
    id: '3',
    email: 'viewer@admin.com',
    password: hashSync(
      'Test12345!',
      genSaltSync(AUTH_CONFIG.PASSWORD.BCRYPT_SALT_ROUNDS),
    ),
    fullName: 'Viewer',
    role: $Enums.Role.viewer,
    isActive: true,
    createdAt: new Date(),
    createdBy: 'seeder',
    updatedAt: new Date(),
    updatedBy: 'seeder',
    tenant: { connect: { id: '1' } },
  },
]

async function main() {
  console.log(`Start seeding ...`)

  // Delete in leaf-to-root FK order — avoids raw SQL and pooler statement timeouts
  await prisma.payslipItem.deleteMany({})
  await prisma.payslip.deleteMany({})
  await prisma.payslipRun.deleteMany({})
  await prisma.payslipPeriod.deleteMany({})
  await prisma.employeeSalaryComponent.deleteMany({})
  await prisma.salaryComponent.deleteMany({})
  await prisma.employee.deleteMany({})
  await prisma.auditLogs.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.tenant.deleteMany({})

  for (const u of userData) {
    const user = await prisma.user.create({ data: u })
    console.log(`Created user with id: ${user.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
