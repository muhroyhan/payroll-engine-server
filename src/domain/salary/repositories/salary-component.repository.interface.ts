/**
 * Salary Component repository interface
 * Defines contract for salary component data access
 */
import { IRepository } from '../../shared/repository.interface'

export interface ISalaryComponentRepository extends IRepository<any> {
  findByTenantId(tenantId: string): Promise<any[]>
  findByCode(code: string): Promise<any | null>
}
