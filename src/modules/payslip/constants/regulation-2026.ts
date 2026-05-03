import { Prisma } from '@prismaclient/client'
import type { PtkpStatus } from '../dto'

export type PayrollRegulationProfile = {
  code: string
  effectiveFrom: Date
  effectiveTo?: Date
  bpjs: {
    kesehatanEmployeeRate: Prisma.Decimal
    kesehatanWageCap: Prisma.Decimal
    jhtEmployeeRate: Prisma.Decimal
    jpEmployeeRate: Prisma.Decimal
    jpWageCap: Prisma.Decimal
  }
  pph21: {
    method: 'annual_progressive'
    nonNpwpRateMultiplier: Prisma.Decimal
    ptkpByStatus: Record<PtkpStatus, Prisma.Decimal>
    occupationalCostRate: Prisma.Decimal
    occupationalCostMonthlyCap: Prisma.Decimal
    annualBrackets: Array<{
      upTo: Prisma.Decimal | null
      rate: Prisma.Decimal
    }>
  }
}

// Default profile for Indonesian payroll in 2026.
// Keep these values configurable in code until finance/legal team confirms updates.
export const IDN_2026_BASE_PROFILE: PayrollRegulationProfile = {
  code: 'IDN_2026_BASE',
  effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
  bpjs: {
    kesehatanEmployeeRate: new Prisma.Decimal('0.01'),
    kesehatanWageCap: new Prisma.Decimal('12000000'),
    jhtEmployeeRate: new Prisma.Decimal('0.02'),
    jpEmployeeRate: new Prisma.Decimal('0.01'),
    jpWageCap: new Prisma.Decimal('10547400'),
  },
  pph21: {
    method: 'annual_progressive',
    nonNpwpRateMultiplier: new Prisma.Decimal('1.20'),
    ptkpByStatus: {
      TK0: new Prisma.Decimal('54000000'),
      TK1: new Prisma.Decimal('58500000'),
      TK2: new Prisma.Decimal('63000000'),
      TK3: new Prisma.Decimal('67500000'),
      K0: new Prisma.Decimal('58500000'),
      K1: new Prisma.Decimal('63000000'),
      K2: new Prisma.Decimal('67500000'),
      K3: new Prisma.Decimal('72000000'),
    },
    occupationalCostRate: new Prisma.Decimal('0.05'),
    occupationalCostMonthlyCap: new Prisma.Decimal('500000'),
    annualBrackets: [
      {
        upTo: new Prisma.Decimal('60000000'),
        rate: new Prisma.Decimal('0.05'),
      },
      {
        upTo: new Prisma.Decimal('250000000'),
        rate: new Prisma.Decimal('0.15'),
      },
      {
        upTo: new Prisma.Decimal('500000000'),
        rate: new Prisma.Decimal('0.25'),
      },
      {
        upTo: new Prisma.Decimal('5000000000'),
        rate: new Prisma.Decimal('0.30'),
      },
      { upTo: null, rate: new Prisma.Decimal('0.35') },
    ],
  },
}

export const PAYROLL_REGULATION_PROFILES: PayrollRegulationProfile[] = [
  IDN_2026_BASE_PROFILE,
]

export function resolvePayrollRegulationProfile(
  profileCode: string | undefined,
  payrollDate: Date,
): PayrollRegulationProfile {
  if (profileCode) {
    const named = PAYROLL_REGULATION_PROFILES.find(
      (profile) => profile.code === profileCode,
    )

    if (!named) {
      throw new Error(`Payroll regulation profile ${profileCode} is not found`)
    }

    return named
  }

  const effective = PAYROLL_REGULATION_PROFILES.find((profile) => {
    const starts = payrollDate >= profile.effectiveFrom
    const ends = profile.effectiveTo ? payrollDate <= profile.effectiveTo : true
    return starts && ends
  })

  if (!effective) {
    throw new Error('No payroll regulation profile configured for payroll date')
  }

  return effective
}
