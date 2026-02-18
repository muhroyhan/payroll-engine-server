/**
 * Employee repository interface
 * Defines contract for employee data access
 */
import { IRepository } from '../../shared/repository.interface'

export interface IEmployeeRepository extends IRepository<any> {
  findByEmail(email: string): Promise<any | null>
  findByTenantId(tenantId: string): Promise<any[]>
}
