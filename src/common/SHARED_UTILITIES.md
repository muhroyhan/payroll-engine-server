## Common Module - Shared Utilities Guide

This directory contains shared utilities, types, and base classes used across all feature modules.

### Directory Structure

```
common/
├── decorators/     # Custom decorators
├── dto/            # Common DTOs (pagination, responses)
├── exceptions/     # Custom exception classes
├── filters/        # Global error filters
├── guards/         # Auth and role guards
├── pipes/          # Validation pipes
├── services/       # Base service class
├── types/          # Shared TypeScript types
└── utils/          # Helper utilities
```

### Key Components

#### 1. DTOs (Data Transfer Objects)

**Location:** `src/common/dto/`

Common DTOs used across all modules:

- `PaginationDto` - Request pagination parameters
- `PaginatedResponse<T>` - Paginated response wrapper
- `SingleResponse<T>` - Single item response wrapper

**Usage in Controllers:**

```typescript
import { PaginationDto, PaginatedResponse } from '@common/dto'

@Controller('employees')
export class EmployeeController {
  @Get()
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<EmployeeDto>> {
    return this.employeeService.findAll(pagination, auditContext)
  }
}
```

#### 2. Base Service

**Location:** `src/common/services/base.service.ts`

Abstract base class providing standard CRUD interface and helper methods.

**Features:**

- Standard CRUD method signatures
- Pagination offset calculation
- Search filter building
- Sorting configuration
- Context-aware logging

**Implementation in Feature Module:**

```typescript
import { BaseService } from '@common/services'
import { AuditContext } from '@common/types'

@Injectable()
export class EmployeeService extends BaseService<
  Employee,
  CreateEmployeeDto,
  UpdateEmployeeDto
> {
  constructor(private prisma: PrismaService) {
    super(EmployeeService.name) // Pass service name for logger
  }

  async findAll(
    pagination: PaginationDto,
    auditContext: AuditContext,
  ): Promise<PaginatedResponse<Employee>> {
    this.logWithContext('log', 'Fetching employees', auditContext)

    const offset = this.calculateOffset(pagination.page, pagination.limit)
    const where = {
      tenantId: auditContext.tenantId, // Multi-tenant filtering
      ...this.buildSearchFilter(pagination.search),
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: offset,
        take: pagination.limit,
        orderBy: this.buildSortConfig(pagination.sortBy, pagination.sortOrder),
      }),
      this.prisma.employee.count({ where }),
    ])

    return new PaginatedResponse(data, total, pagination.page, pagination.limit)
  }

  async create(
    createDto: CreateEmployeeDto,
    auditContext: AuditContext,
  ): Promise<Employee> {
    this.logWithContext('log', 'Creating employee', auditContext)

    return this.prisma.employee.create({
      data: {
        ...createDto,
        tenantId: auditContext.tenantId,
        createdBy: auditContext.userId,
        updatedBy: auditContext.userId,
      },
    })
  }

  // Implement other CRUD methods...
}
```

#### 3. Audit Types & Utilities

**Location:** `src/common/types/audit.type.ts` and `src/common/utils/audit.util.ts`

Track user and tenant context for all operations.

**Types:**

- `AuditMetadata` - Record creation/update metadata
- `AuditContext` - Current user and action context

**Utilities:**

- `getAuditContext(request)` - Extract audit context from request
- `buildAuditContext(request, action, metadata)` - Build context with custom action
- `ensureUserContext(request)` - Validate user is authenticated

**Usage in Controllers:**

```typescript
import { buildAuditContext } from '@common/utils'
import { AuthUser } from '@common/decorators'

@Controller('employees')
export class EmployeeController {
  @Post()
  async create(
    @Body() createDto: CreateEmployeeDto,
    @Req() request: Request,
    @AuthUser() user: any, // Custom decorator
  ): Promise<SingleResponse<Employee>> {
    const auditContext = buildAuditContext(request, 'CREATE')

    const data = await this.employeeService.create(createDto, auditContext)

    return new SingleResponse(data, 'Employee created successfully')
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<SingleResponse<Employee>> {
    const auditContext = buildAuditContext(request, 'READ')

    const data = await this.employeeService.findOne(id, auditContext)

    return new SingleResponse(data)
  }
}
```

#### 4. Multi-Tenant Support

All services **must** filter by `tenantId` from audit context:

```typescript
// ALWAYS include tenantId in queries
const where = {
  tenantId: auditContext.tenantId, // Required!
  // other filters...
}

this.prisma.employee.findMany({ where })
```

### Best Practices

1. **Always use AuditContext** - Pass it through service methods for tracking
2. **Extend BaseService** - Consistency across all modules
3. **Filter by Tenant** - Never query across tenants
4. **Use DTOs** - Always use pagination and response DTOs
5. **Log with Context** - Use `logWithContext()` for better debugging
6. **Audit Metadata** - Always capture `createdBy` and `updatedBy`

### Creating a New Module

1. **Generate base structure:**

   ```bash
   nest g module modules/my-feature
   nest g controller modules/my-feature/controllers
   nest g service modules/my-feature/services
   ```

2. **Create DTOs:**

   ```typescript
   // Create entity-specific DTOs
   // Extend common DTOs where needed
   ```

3. **Create Service:**

   ```typescript
   @Injectable()
   export class MyFeatureService extends BaseService<
     Entity,
     CreateDto,
     UpdateDto
   > {
     // Implement abstract methods
   }
   ```

4. **Create Controller:**
   ```typescript
   @Controller('my-feature')
   export class MyFeatureController {
     // Use pagination, audit context, and response DTOs
   }
   ```

### Example: Complete Feature Module

See `src/modules/auth/` for complete working example with authentication and authorization.

### Adding New Common Utilities

Guidelines for adding new shared utilities:

1. **Place in appropriate folder** - `dto/`, `types/`, `utils/`, `services/`, etc.
2. **Export from index files** - Update barrel exports in `index.ts`
3. **Document usage** - Add JSDoc comments
4. **Test thoroughly** - Test across multiple modules

---

**Maintained by:** Development Team  
**Last Updated:** February 21, 2026
