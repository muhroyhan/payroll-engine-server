import { PrismaPg } from '@prisma/adapter-pg'
import { $Enums, Prisma, PrismaClient } from '@prismaclient/client'
import 'dotenv/config'
import { genSaltSync, hashSync } from 'bcryptjs'
import { SALT } from '@src/constants'
import { buildDatabaseUrl } from '@src/database/database-url'

const pool = new PrismaPg({ connectionString: buildDatabaseUrl() })
const prisma = new PrismaClient({ adapter: pool })

const userData: Prisma.UserCreateInput[] = [
  {
    id: '1',
    email: 'admin@admin.com',
    password: hashSync('Test12345!', genSaltSync(SALT)),
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
]

async function main() {
  console.log(`Start seeding ...`)

  // Clear existing data
  await prisma.tenant.deleteMany()
  await prisma.user.deleteMany()

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
