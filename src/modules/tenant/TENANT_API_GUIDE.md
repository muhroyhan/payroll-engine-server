## Tenant Module

Complete tenant management module. Tenants represent organizations in the system. All other data (employees, users, salaries, payslips) belong to a tenant.

### File Structure

```
src/modules/tenant/
├── controllers/
│   ├── tenant.controller.ts    # HTTP endpoints
│   └── index.ts                # Exports
├── services/
│   ├── tenant.service.ts       # Business logic
│   └── index.ts                # Exports
├── dto/
│   └── index.ts                # Request/Response DTOs
├── tenant.module.ts            # Module declaration
└── index.ts                    # Module exports
```

### Features

- ✅ Create new tenants
- ✅ List tenants with pagination & search
- ✅ Get tenant by ID
- ✅ Update tenant information
- ✅ Delete tenant (only if no related data exists)
- ✅ Get tenant statistics (users count, employees count)
- ✅ Unique tenant code validation
- ✅ Audit tracking (createdBy, updatedBy)

### API Endpoints

All endpoints require JWT authentication (Bearer token).

#### List Tenants

```http
GET /tenants?page=1&limit=10&search=acme&sortBy=name&sortOrder=asc
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search by name, code, or description
- `sortBy` - Field to sort by (e.g., name, createdAt)
- `sortOrder` - asc or desc

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corporation",
      "code": "acme-corp",
      "description": "Main company office",
      "createdBy": "user-id",
      "createdAt": "2026-02-22T10:30:00Z",
      "updatedBy": "user-id",
      "updatedAt": "2026-02-22T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

#### Get Tenant by ID

```http
GET /tenants/:id
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "uuid",
    "name": "Acme Corporation",
    "code": "acme-corp",
    "description": "Main company office",
    "createdBy": "user-id",
    "createdAt": "2026-02-22T10:30:00Z",
    "updatedBy": "user-id",
    "updatedAt": "2026-02-22T10:30:00Z"
  },
  "message": "Tenant retrieved successfully"
}
```

#### Create Tenant

Auto-generates tenant code with format: `TNT-{increment number}` (e.g., TNT-000001)

```http
POST /tenants
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "name": "Acme Corporation"
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "uuid",
    "name": "Acme Corporation",
    "code": "TNT-000001",
    "createdBy": "user-id",
    "createdAt": "2026-02-22T10:30:00Z",
    "updatedBy": "user-id",
    "updatedAt": "2026-02-22T10:30:00Z"
  },
  "message": "Tenant created successfully"
}
```

**Validations:**

- `name` - Required, 3-255 characters
- `code` - Auto-generated in format: TNT-{increment number}

#### Update Tenant

```http
PATCH /tenants/:id
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "name": "Acme Corporation Inc",
  "description": "Updated description"
}
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "uuid",
    "name": "Acme Corporation Inc",
    "code": "acme-corp",
    "description": "Updated description",
    "createdBy": "user-id",
    "createdAt": "2026-02-22T10:30:00Z",
    "updatedBy": "user-id",
    "updatedAt": "2026-02-22T10:30:00Z"
  },
  "message": "Tenant updated successfully"
}
```

#### Delete Tenant

```http
DELETE /tenants/:id
Authorization: Bearer <jwt_token>
```

**Response (204 No Content):**

- No response body

**Error Response (400 Bad Request):**

```json
{
  "code": "BAD_REQUEST",
  "message": "Cannot delete tenant: It is assigned to Users (5), Employees (12), Salary Components (3). Please remove all related data first.",
  "timestamp": "2026-02-22T10:30:00.000Z",
  "path": "/tenants/:id"
}
```

**Validations:**

- Tenant must not have any related data in other modules:
  - ❌ Users assigned
  - ❌ Employees assigned
  - ❌ Salary Components assigned
  - ❌ Payslip Periods
  - ❌ Payslip Runs
  - ❌ Payslips
- Error message will list which modules have data and the count

**Note:** Remove all related data from associated modules before deleting a tenant.

#### Get Tenant Statistics

```http
GET /tenants/:id/stats
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "data": {
    "usersCount": 25,
    "employeesCount": 150
  },
  "message": "Tenant statistics retrieved successfully"
}
```

### Testing with cURL

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  | jq -r '.accessToken')

# List tenants
curl -X GET http://localhost:3000/tenants \
  -H "Authorization: Bearer $TOKEN"

# Create tenant
curl -X POST http://localhost:3000/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Company"
  }'

# Get tenant
curl -X GET http://localhost:3000/tenants/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"

# Update tenant
curl -X PATCH http://localhost:3000/tenants/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Company Updated"
  }'

# Get stats
curl -X GET http://localhost:3000/tenants/550e8400-e29b-41d4-a716-446655440000/stats \
  -H "Authorization: Bearer $TOKEN"

# Delete tenant
curl -X DELETE http://localhost:3000/tenants/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

### Database Schema

```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String
  code      String   @unique
  description String?
  createdAt DateTime @default(now())
  createdBy String
  updatedAt DateTime @updatedAt
  updatedBy String

  // Relations
  users                    User[]
  employees                Employee[]
  salaryComponents         SalaryComponent[]
  employeeSalaryComponents EmployeeSalaryComponent[]
  auditLogs                AuditLogs[]
  payslipPeriods           PayslipPeriod[]
  payslipRuns              PayslipRun[]
  payslips                 Payslip[]
}
```

### Service Methods

#### Public API

```typescript
// Get all tenants (paginated)
findAll(
  pagination: PaginationDto,
  auditContext: AuditContext,
): Promise<PaginatedResponse<TenantDto>>

// Get single tenant
findOne(id: string, auditContext: AuditContext): Promise<TenantDto>

// Get tenant by code (lookup)
findByCode(code: string): Promise<TenantDto>

// Create new tenant
create(
  createDto: CreateTenantDto,
  auditContext: AuditContext,
): Promise<TenantDto>

// Update tenant
update(
  id: string,
  updateDto: UpdateTenantDto,
  auditContext: AuditContext,
): Promise<TenantDto>

// Delete tenant
delete(id: string, auditContext: AuditContext): Promise<void>

// Get statistics
getTenantUsersCount(tenantId: string): Promise<number>
getTenantEmployeesCount(tenantId: string): Promise<number>
```

### Integration with Other Modules

When creating other modules (Employee, SalaryComponent, etc.), always:

1. **Filter by Tenant**

   ```typescript
   const where = {
     tenantId: auditContext.tenantId, // From JWT token
     // other filters...
   }
   ```

2. **Include Tenant in Audit**

   ```typescript
   const data = {
     ...createDto,
     tenantId: auditContext.tenantId,
     createdBy: auditContext.userId,
     updatedBy: auditContext.userId,
   }
   ```

3. **Export TenantService from TenantModule**

   ```typescript
   @Module({
     exports: [TenantService],
   })
   export class TenantModule {}
   ```

4. **Inject TenantService when needed**
   ```typescript
   constructor(private tenantService: TenantService) {}
   ```

### Error Handling

- **404 Not Found** - Tenant does not exist
- **400 Bad Request** - Validation failed (e.g., duplicate code)
- **401 Unauthorized** - Missing or invalid JWT token
- **500 Internal Server Error** - Database or server error

All errors are caught by the global exception filter and return consistent error responses.

### Audit Logging

All operations are tracked:

- `createdBy` - User ID who created the tenant
- `createdAt` - Timestamp when created
- `updatedBy` - User ID who last updated
- `updatedAt` - Last update timestamp

View audit logs in Prisma Studio:

```bash
bun prisma studio
# Navigate to AuditLogs table
```

---

**Created:** February 22, 2026  
**Status:** Complete and Ready for Use  
**Next Steps:** Create Employee Module
