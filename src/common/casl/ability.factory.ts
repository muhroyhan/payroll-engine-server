import {
  AbilityBuilder,
  AnyMongoAbility,
  createMongoAbility,
} from '@casl/ability'
import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prismaclient/client'
import type { AuthUser } from '@src/common/types'
import type { AuditContext } from '@src/common/types'

export type AppAction = 'manage' | 'read'
export type AppSubject = 'all'
export type AppAbility = AnyMongoAbility
export type ScopeSubject =
  | 'User'
  | 'Tenant'
  | 'Employee'
  | 'SalaryComponent'
  | 'PayslipPeriod'
  | 'PayslipRun'
  | 'Payslip'
export type ScopeAbility = AnyMongoAbility

type AccessContext = Pick<AuthUser, 'role' | 'tenantId'> | AuditContext

@Injectable()
export class AbilityFactory {
  createForUser(user: AuthUser): AppAbility {
    const { can, build } = new AbilityBuilder<AnyMongoAbility>(
      createMongoAbility,
    )

    if (user.role === 'superadmin') {
      can('manage', 'all')
      return build()
    }

    if (user.role === 'viewer') {
      can('read', 'all')
      return build()
    }

    can('manage', 'all')
    can('read', 'all')

    return build()
  }

  createScopeForContext(context: AccessContext): ScopeAbility {
    const { can, build } = new AbilityBuilder<AnyMongoAbility>(
      createMongoAbility,
    )

    if (context.role === 'superadmin') {
      can('manage', 'User')
      can('manage', 'Tenant')
      can('manage', 'Employee')
      can('manage', 'SalaryComponent')
      can('manage', 'PayslipPeriod')
      can('manage', 'PayslipRun')
      can('manage', 'Payslip')
      return build()
    }

    if (context.tenantId === null) {
      return build()
    }

    if (context.role === 'viewer') {
      can('read', 'User', { tenantId: context.tenantId })
      can('read', 'Tenant', { id: context.tenantId })
      can('read', 'Employee', { tenantId: context.tenantId })
      can('read', 'SalaryComponent', { tenantId: context.tenantId })
      can('read', 'PayslipPeriod', { tenantId: context.tenantId })
      can('read', 'PayslipRun', { tenantId: context.tenantId })
      can('read', 'Payslip', { tenantId: context.tenantId })
      return build()
    }

    can('manage', 'User', { tenantId: context.tenantId })
    can('manage', 'Tenant', { id: context.tenantId })
    can('manage', 'Employee', { tenantId: context.tenantId })
    can('manage', 'SalaryComponent', { tenantId: context.tenantId })
    can('manage', 'PayslipPeriod', { tenantId: context.tenantId })
    can('manage', 'PayslipRun', { tenantId: context.tenantId })
    can('manage', 'Payslip', { tenantId: context.tenantId })
    return build()
  }

  buildUserWhere(
    context: AccessContext,
    action: AppAction,
  ): Prisma.UserWhereInput | null {
    const conditions = this.getConditions(
      this.createScopeForContext(context),
      action,
      'User',
    )

    if (conditions === null) return null
    if (conditions.length === 0) return { id: -1 }
    if (conditions.length === 1) return conditions[0] as Prisma.UserWhereInput

    return { OR: conditions as Prisma.UserWhereInput[] }
  }

  buildTenantWhere(
    context: AccessContext,
    action: AppAction,
  ): Prisma.TenantWhereInput | null {
    const conditions = this.getConditions(
      this.createScopeForContext(context),
      action,
      'Tenant',
    )

    if (conditions === null) return null
    if (conditions.length === 0) return { id: -1 }
    if (conditions.length === 1) return conditions[0] as Prisma.TenantWhereInput

    return { OR: conditions as Prisma.TenantWhereInput[] }
  }

  buildEmployeeWhere(
    context: AccessContext,
    action: AppAction,
  ): Prisma.EmployeeWhereInput | null {
    const conditions = this.getConditions(
      this.createScopeForContext(context),
      action,
      'Employee',
    )

    if (conditions === null) return null
    if (conditions.length === 0) return { id: -1 }
    if (conditions.length === 1)
      return conditions[0] as Prisma.EmployeeWhereInput

    return { OR: conditions as Prisma.EmployeeWhereInput[] }
  }

  buildSalaryComponentWhere(
    context: AccessContext,
    action: AppAction,
  ): Prisma.SalaryComponentWhereInput | null {
    const conditions = this.getConditions(
      this.createScopeForContext(context),
      action,
      'SalaryComponent',
    )

    if (conditions === null) return null
    if (conditions.length === 0) return { id: -1 }
    if (conditions.length === 1)
      return conditions[0] as Prisma.SalaryComponentWhereInput

    return { OR: conditions as Prisma.SalaryComponentWhereInput[] }
  }

  buildPayslipPeriodWhere(
    context: AccessContext,
    action: AppAction,
  ): Prisma.PayslipPeriodWhereInput | null {
    const conditions = this.getConditions(
      this.createScopeForContext(context),
      action,
      'PayslipPeriod',
    )

    if (conditions === null) return null
    if (conditions.length === 0) return { id: -1 }
    if (conditions.length === 1)
      return conditions[0] as Prisma.PayslipPeriodWhereInput

    return { OR: conditions as Prisma.PayslipPeriodWhereInput[] }
  }

  buildPayslipRunWhere(
    context: AccessContext,
    action: AppAction,
  ): Prisma.PayslipRunWhereInput | null {
    const conditions = this.getConditions(
      this.createScopeForContext(context),
      action,
      'PayslipRun',
    )

    if (conditions === null) return null
    if (conditions.length === 0) return { id: -1 }
    if (conditions.length === 1)
      return conditions[0] as Prisma.PayslipRunWhereInput

    return { OR: conditions as Prisma.PayslipRunWhereInput[] }
  }

  buildPayslipWhere(
    context: AccessContext,
    action: AppAction,
  ): Prisma.PayslipWhereInput | null {
    const conditions = this.getConditions(
      this.createScopeForContext(context),
      action,
      'Payslip',
    )

    if (conditions === null) return null
    if (conditions.length === 0) return { id: -1 }
    if (conditions.length === 1) return conditions[0] as Prisma.PayslipWhereInput

    return { OR: conditions as Prisma.PayslipWhereInput[] }
  }

  resolveManagedTenantId(context: AccessContext): number | null {
    const where = this.buildTenantWhere(context, 'manage')
    if (where === null) return null

    if (typeof where.id === 'number') {
      return where.id
    }

    return null
  }

  private getConditions(
    ability: ScopeAbility,
    action: AppAction,
    subject: ScopeSubject,
  ): Array<Record<string, unknown>> | null {
    type RuleCondition = {
      inverted?: boolean
      conditions?: Record<string, unknown>
    }

    const rules: RuleCondition[] = ability
      .rulesFor(action, subject)
      .filter((rule: RuleCondition) => !rule.inverted)

    if (rules.length === 0) return []
    if (rules.some((rule: RuleCondition) => !rule.conditions)) return null

    return rules.map(
      (rule: RuleCondition) => rule.conditions as Record<string, unknown>,
    )
  }
}
