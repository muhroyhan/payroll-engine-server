/**
 * Payroll repository interface
 * Defines contract for payroll data access
 */
import { IRepository } from '../../shared/repository.interface'

export interface IPayrollRepository extends IRepository<any> {
  findByTenantId(tenantId: string): Promise<any[]>
  findByStatus(status: string): Promise<any[]>
}
