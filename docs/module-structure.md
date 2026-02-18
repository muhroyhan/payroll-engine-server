# Module Structure Guide

This document explains the standard structure for each feature module and how to organize them for scalability and maintainability.

## Standard Module Template

Every feature module should follow this structure:

```
modules/your-module/
├── controllers/
│   ├── your-module.controller.ts
│   └── index.ts
├── services/
│   ├── your-module.service.ts
│   └── index.ts
├── dto/
│   ├── create-your-module.dto.ts
│   ├── update-your-module.dto.ts
│   └── index.ts
├── types/
│   ├── your-module.type.ts
│   └── index.ts
├── your-module.module.ts
├── your-module.controller.spec.ts
└── your-module.service.spec.ts
```

## Detailed Folder Explanations

### `controllers/`

Contains HTTP endpoint handlers.

**Responsibilities:**

- Define routes
- Validate path parameters
- Call services
- Format responses
- Handle HTTP status codes

**Example:**

```typescript
// modules/employee/controllers/employee.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { EmployeeService } from '../services'
import { CreateEmployeeDto } from '../dto/create-employee.dto'

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id)
  }
}
```

### `services/`

Contains business logic orchestration.

**Responsibilities:**

- Coordinate between controllers and domain
- Implement module-specific business logic
- Call domain services
- Access repositories
- Handle transactions

**Example:**

```typescript
// modules/employee/services/employee.service.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/database/prisma.service'
import { CreateEmployeeDto } from '../dto/create-employee.dto'

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: createEmployeeDto,
    })
  }

  async findOne(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
    })
  }
}
```

### `dto/` (Data Transfer Objects)

Contains request/response schemas with validation.

**Responsibilities:**

- Define input validation rules
- Define response shapes
- Document API contracts

**Naming Convention:**

- `create-{entity}.dto.ts` - POST requests
- `update-{entity}.dto.ts` - PATCH/PUT requests
- `{entity}-response.dto.ts` - Response shaping

**Example:**

```typescript
// modules/employee/dto/create-employee.dto.ts
import { IsEmail, IsString, IsNotEmpty } from 'class-validator'

export class CreateEmployeeDto {
  @IsEmail()
  email: string

  @IsString()
  @IsNotEmpty()
  fullName: string

  @IsString()
  department: string
}
```

### `types/`

Module-specific TypeScript types and interfaces.

**Usage:**

- Response types
- Internal type definitions
- Generic types used only in this module

**Example:**

```typescript
// modules/employee/types/employee-response.type.ts
export interface EmployeeResponse {
  id: string
  email: string
  fullName: string
  department: string
  createdAt: Date
}
```

### Root Files

#### `{module}.module.ts`

Defines the module and its dependencies.

```typescript
import { Module } from '@nestjs/common'
import { EmployeeController } from './controllers'
import { EmployeeService } from './services'
import { DatabaseModule } from '@src/database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService], // Export for use by other modules
})
export class EmployeeModule {}
```

#### `{module}.controller.spec.ts` / `{module}.service.spec.ts`

Unit tests for controllers and services.

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { EmployeeService } from './employee.service'
import { PrismaService } from '@src/database/prisma.service'

describe('EmployeeService', () => {
  let service: EmployeeService
  let prisma: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeeService, PrismaService],
    }).compile()

    service = module.get<EmployeeService>(EmployeeService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
```

## Creating a New Module

Use NestJS CLI to scaffold:

```bash
npm run nest g module modules/your-module
npm run nest g controller modules/your-module/controllers/your-module
npm run nest g service modules/your-module/services/your-module
```

Then manually create:

1. `dto/` folder with DTOs
2. `types/` folder if needed
3. Update module imports in `app.module.ts`

## Best Practices

### 1. **Use Barrels (index.ts)**

Create `index.ts` files in each folder for cleaner imports.

```typescript
// controllers/index.ts
export * from './your-module.controller'
```

Then import as:

```typescript
// In module.ts
import { YourModuleController } from './controllers'
```

### 2. **Organize by Feature, Not by Type**

✅ GOOD:

```
modules/
├── employee/
│   ├── controllers/
│   ├── services/
│   └── dto/
```

❌ BAD:

```
controllers/
services/
dto/
```

### 3. **Keep Modules Independent**

Each module should be self-contained and reusable.

### 4. **Consistent Naming**

- Controllers: `{Feature}Controller` (e.g., `EmployeeController`)
- Services: `{Feature}Service` (e.g., `EmployeeService`)
- DTOs: `{Action}{Feature}Dto` (e.g., `CreateEmployeeDto`)
- Types: `{Feature}Response` (e.g., `EmployeeResponse`)

### 5. **Documentation**

Add JSDoc comments to public methods:

```typescript
/**
 * Creates a new employee
 * @param createEmployeeDto - Employee creation data
 * @returns Created employee
 * @throws BadRequestException if email already exists
 */
async create(createEmployeeDto: CreateEmployeeDto) {
  // ...
}
```

## Module Dependencies

### Allowed Imports

- `@nestjs/*` - NestJS framework
- `@src/common/*` - Shared utilities
- `@src/config/*` - Configuration
- `@src/database/*` - Database services
- `@src/domain/*` - Domain entities and interfaces
- `@src/infra/*` - Infrastructure services
- Other modules (with caution - avoid circular deps)

### Forbidden Imports

- ❌ From sibling modules (unless explicitly exported)
- ❌ Implementation details from other modules
- ❌ Creating circular dependencies

## Examples

### Simple CRUD Module

```typescript
// modules/salary-component/controllers/salary-component.controller.ts
@Controller('salary-components')
export class SalaryComponentController {
  constructor(private readonly service: SalaryComponentService) {}

  @Post()
  create(@Body() dto: CreateSalaryComponentDto) {
    return this.service.create(dto)
  }

  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalaryComponentDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
```

### Complex Module with Domain Logic

```typescript
// modules/payroll/services/payroll.service.ts
@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private payrollEngine: PayrollEngineService, // Domain service
    private payslipService: PayslipService,
  ) {}

  async processPayroll(params: ProcessPayrollDto) {
    // Use domain logic
    const calculation = await this.payrollEngine.calculate(params)

    // Store result
    const payslip = await this.prisma.payslip.create({
      data: calculation,
    })

    return payslip
  }
}
```

---

_For architecture overview, see [architecture.md](./architecture.md)_
