import { PrismaPg } from '@prisma/adapter-pg'
import { $Enums, PrismaClient } from '@prismaclient/client'
import 'dotenv/config'
import { genSaltSync, hashSync } from 'bcryptjs'
import { buildDatabaseUrl } from '@src/database/database-url'
import { AUTH_CONFIG } from '@src/modules/auth/auth.config'

const pool = new PrismaPg({ connectionString: buildDatabaseUrl() })
const prisma = new PrismaClient({ adapter: pool })

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

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Tenant',
      code: 'TNT-01',
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
  })

  const userData = [
    {
      email: 'superadmin@admin.com',
      password: hashSync(
        'Test12345!',
        genSaltSync(AUTH_CONFIG.PASSWORD.BCRYPT_SALT_ROUNDS),
      ),
      fullName: 'Super Admin',
      role: $Enums.Role.superadmin,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
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
      tenantId: tenant.id,
    },
    {
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
      tenantId: tenant.id,
    },
    {
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
      tenantId: tenant.id,
    },
  ]

  for (const u of userData) {
    const user = await prisma.user.create({ data: u })
    console.log(`Created user with id: ${user.id}`)
  }

  const employeeData = [
    {
      tenantId: tenant.id,
      employeeCode: 'EMP-000001',
      fullName: 'Budi Santoso',
      position: 'HR Staff',
      employeeType: $Enums.EmployeeType.permanent,
      baseSalary: 8500000,
      joinDate: new Date('2024-01-15T00:00:00.000Z'),
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      employeeCode: 'EMP-000002',
      fullName: 'Siti Rahmawati',
      position: 'Finance Officer',
      employeeType: $Enums.EmployeeType.permanent,
      baseSalary: 9500000,
      joinDate: new Date('2024-03-01T00:00:00.000Z'),
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      employeeCode: 'EMP-000003',
      fullName: 'Andi Pratama',
      position: 'Payroll Analyst',
      employeeType: $Enums.EmployeeType.contract,
      baseSalary: 7800000,
      joinDate: new Date('2024-06-10T00:00:00.000Z'),
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      employeeCode: 'EMP-000004',
      fullName: 'Dewi Lestari',
      position: 'Accountant',
      employeeType: $Enums.EmployeeType.permanent,
      baseSalary: 10250000,
      joinDate: new Date('2023-11-20T00:00:00.000Z'),
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      employeeCode: 'EMP-000005',
      fullName: 'Rizky Hidayat',
      position: 'Operations Admin',
      employeeType: $Enums.EmployeeType.contract,
      baseSalary: 7000000,
      joinDate: new Date('2025-01-05T00:00:00.000Z'),
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
  ]

  const employeeResult = await prisma.employee.createMany({
    data: employeeData,
  })
  console.log(`Created employees: ${employeeResult.count}`)

  const salaryComponentData = [
    {
      tenantId: tenant.id,
      name: 'Transport Allowance',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 750000,
      isTaxable: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      name: 'Meal Allowance',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 500000,
      isTaxable: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      name: 'Attendance Bonus',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.percentage,
      defaultValue: 5,
      isTaxable: true,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      name: 'BPJS Deduction',
      type: $Enums.SalaryType.deduction,
      calculationType: $Enums.CalculationType.percentage,
      defaultValue: 2,
      isTaxable: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
    {
      tenantId: tenant.id,
      name: 'Loan Deduction',
      type: $Enums.SalaryType.deduction,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 300000,
      isTaxable: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seeder',
      updatedAt: new Date(),
      updatedBy: 'seeder',
    },
  ]

  const salaryComponentResult = await prisma.salaryComponent.createMany({
    data: salaryComponentData,
  })
  console.log(`Created salary components: ${salaryComponentResult.count}`)

  const employees = await prisma.employee.findMany({
    where: {
      tenantId: tenant.id,
    },
    select: {
      id: true,
      employeeCode: true,
    },
  })

  const employeeByCode = new Map(
    employees.map((item) => [item.employeeCode, item]),
  )

  const employeeSalaryComponentData = [
    {
      employeeCode: 'EMP-000001',
      name: 'Transport Allowance',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 750000,
      isTaxable: false,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000001',
      name: 'BPJS Deduction',
      type: $Enums.SalaryType.deduction,
      calculationType: $Enums.CalculationType.percentage,
      defaultValue: 2,
      isTaxable: false,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000002',
      name: 'Meal Allowance',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 500000,
      isTaxable: false,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000002',
      name: 'Attendance Bonus',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.percentage,
      defaultValue: 5,
      isTaxable: true,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000003',
      name: 'Transport Allowance',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 600000,
      isTaxable: false,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000003',
      name: 'Loan Deduction',
      type: $Enums.SalaryType.deduction,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 250000,
      isTaxable: false,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000004',
      name: 'Attendance Bonus',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.percentage,
      defaultValue: 7,
      isTaxable: true,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000004',
      name: 'BPJS Deduction',
      type: $Enums.SalaryType.deduction,
      calculationType: $Enums.CalculationType.percentage,
      defaultValue: 2,
      isTaxable: false,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000005',
      name: 'Meal Allowance',
      type: $Enums.SalaryType.allowance,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 400000,
      isTaxable: false,
      isActive: true,
    },
    {
      employeeCode: 'EMP-000005',
      name: 'Loan Deduction',
      type: $Enums.SalaryType.deduction,
      calculationType: $Enums.CalculationType.fixed,
      defaultValue: 300000,
      isTaxable: false,
      isActive: true,
    },
  ]

  const employeeSalaryComponentsToCreate = employeeSalaryComponentData.map(
    (item) => {
      const employee = employeeByCode.get(item.employeeCode)

      if (!employee) {
        throw new Error(`Employee not found for code ${item.employeeCode}`)
      }

      return {
        employeeId: employee.id,
        tenantId: tenant.id,
        name: item.name,
        type: item.type,
        calculationType: item.calculationType,
        defaultValue: item.defaultValue,
        isTaxable: item.isTaxable,
        isActive: item.isActive,
        createdAt: new Date(),
        createdBy: 'seeder',
        updatedAt: new Date(),
        updatedBy: 'seeder',
      }
    },
  )

  const employeeSalaryComponentResult =
    await prisma.employeeSalaryComponent.createMany({
      data: employeeSalaryComponentsToCreate,
    })
  console.log(
    `Created employee salary components: ${employeeSalaryComponentResult.count}`,
  )

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
