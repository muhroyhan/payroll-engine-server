/**
 * Base repository interface for generic CRUD operations
 * All repositories should implement this interface
 */
export interface IRepository<T, ID = string> {
  create(data: Partial<T>): Promise<T>
  findById(id: ID): Promise<T | null>
  findAll(filters?: Record<string, any>): Promise<T[]>
  update(id: ID, data: Partial<T>): Promise<T>
  delete(id: ID): Promise<boolean>
}
