# Architecture Documentation

## Overview

This is a scalable, maintainable payroll engine built with NestJS. The architecture is organized into distinct layers following Domain-Driven Design (DDD) and Clean Architecture principles.

## Directory Structure

```
src/
├── common/                      # Shared utilities and cross-cutting concerns
│   ├── decorators/             # Custom decorators
│   ├── guards/                 # Authentication & authorization guards
│   ├── types/                  # Shared TypeScript types
│   ├── exceptions/             # Exception classes (new)
│   ├── filters/                # Global exception filters (new)
│   ├── pipes/                  # Validation pipes (new)
│   ├── constants/              # Application constants (new)
│   └── utils/                  # Utility functions (new)
│
├── config/                     # Configuration management
│   ├── app.config.ts
│   ├── auth.config.ts
│   ├── db.config.ts
│   └── validation.ts
│
├── database/                   # Data access layer
│   ├── prisma/                # Database connection (new)
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── domain/                     # Core business logic (Domain layer)
│   ├── employee/
│   │   ├── entities/          # Domain entities
│   │   ├── repositories/      # Repository interfaces
│   │   ├── services/          # Business logic
│   │   └── employee.entity.ts
│   │
│   ├── payroll/
│   │   ├── entities/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── calculation.service.ts
│   │   ├── payroll-engine.service.ts
│   │   ├── proration.service.ts
│   │   └── rule-evaluator.service.ts
│   │
│   ├── salary/
│   │   ├── entities/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── salary-component.entity.ts
│   │
│   └── shared/
│       ├── repository.interface.ts
│       └── money.value-object.ts
│
├── infra/                      # Infrastructure & cross-cutting concerns
│   ├── logging/
│   │   └── logging.service.ts
│   ├── queue/
│   │   ├── payroll.processor.ts
│   │   └── queue.module.ts
│   └── storage/
│       └── file-storage.service.ts
│
├── modules/                    # Feature modules (Application layer)
│   ├── auth/
│   │   ├── controllers/        # HTTP endpoints
│   │   ├── services/           # Module services
│   │   ├── dto/                # Data transfer objects
│   │   ├── guards/             # Auth-specific guards
│   │   ├── strategies/         # Passport strategies
│   │   ├── types/              # Module types
│   │   └── auth.module.ts
│   │
│   ├── employee/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── types/
│   │   └── employee.module.ts
│   │
│   ├── payroll/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── processors/         # Queue processors
│   │   └── payroll.module.ts
│   │
│   ├── payslip/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── payslip.module.ts
│   │
│   ├── salary-component/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── salary-component.module.ts
│   │
│   ├── tenant/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── tenant.module.ts
│   │
│   ├── users/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── users.module.ts
│   │
│   └── audit/
│       ├── controllers/
│       ├── services/
│       ├── dto/
│       └── audit.module.ts
│
├── app.module.ts               # Root module
└── main.ts                     # Application entry point
```

## Architectural Layers

### 1. **Common Layer** (`src/common/`)

Shared utilities and infrastructure concerns used across the entire application.

**Responsibilities:**

- Decorators: Custom HTTP decorators (`@CurrentUser`, etc.)
- Guards: Authentication/authorization logic
- Exceptions: Custom exception hierarchy for consistent error handling
- Filters: Global exception filters for centralized error responses
- Pipes: Input validation and transformation
- Constants: Application-wide constants
- Types: Shared TypeScript interfaces

**Key Files:**

- `exceptions/base.exception.ts` - Base exception class
- `filters/global-exception.filter.ts` - Centralized error handling
- `pipes/validation.pipe.ts` - DTO validation

### 2. **Config Layer** (`src/config/`)

Configuration management for different environments.

**Responsibilities:**

- Database configuration
- Authentication settings
- Application settings
- Validation schemas

### 3. **Database Layer** (`src/database/`)

Data access abstraction using Prisma ORM.

**Responsibilities:**

- Prisma client initialization
- Database service
- Connection management

**Note:** Consider implementing the Repository pattern here for better abstraction.

### 4. **Domain Layer** (`src/domain/`)

Core business logic and domain models (Domain-Driven Design).

**Responsibilities:**

- Business entities
- Value objects
- Business rules and logic
- Repository interfaces (contracts)
- Domain services

**Key Entities:**

- `Employee` - Employee information and employment details
- `SalaryComponent` - Salary component definitions
- `Payroll` - Payroll calculations and management
- `PayslipPeriod` - Payroll periods

**Guidelines:**

- ✅ Can import from domain layer only
- ✅ Can define repository interfaces
- ❌ DO NOT import from modules (causes circular dependencies)
- ❌ DO NOT import from HTTP/infrastructure concerns

### 5. **Infrastructure Layer** (`src/infra/`)

Cross-cutting concerns and infrastructure services.

**Responsibilities:**

- Logging
- Message queue/event processing
- File storage
- External service integration

**Modules:**

- `logging/` - Centralized logging service
- `queue/` - Async job processing
- `storage/` - File upload/download handling

### 6. **Application Layer** (`src/modules/`)

Feature modules that handle HTTP requests and coordinate domain logic.

**Standard Module Structure:**

```
module/
├── controllers/          # HTTP endpoints
├── services/            # Business logic orchestration
├── dto/                 # Data transfer objects (Input/Output)
├── types/               # Module-specific types
├── guards/              # Module-specific guards (if any)
├── strategies/          # Module-specific strategies (if any)
└── module.module.ts     # Module definition
```

**Module Responsibilities:**

- Handle HTTP requests
- Validate input (DTOs)
- Coordinate with domain services
- Format responses

**Guidelines:**

- ✅ Import from common, config, database, domain, infra
- ✅ Import from other modules carefully (avoid circular)
- ❌ DO NOT contain business logic (move to domain)
- ❌ DO NOT create tight coupling with infrastructure

## Dependency Flow

```
                    HTTP Request
                         ↓
        ┌────────────────────────────────┐
        │   Application Layer (Modules)  │
        │   ├─ Controllers               │
        │   └─ Services                  │
        └────────────────────────────────┘
                    ↓ uses
        ┌────────────────────────────────┐
        │      Domain Layer              │
        │   ├─ Entities                  │
        │   ├─ Services                  │
        │   └─ Interfaces                │
        └────────────────────────────────┘
                    ↓ uses
        ┌────────────────────────────────┐
        │     Infrastructure Layer       │
        │   ├─ Database                  │
        │   ├─ Queue                     │
        │   └─ Logging                   │
        └────────────────────────────────┘
                    ↓ uses
        ┌────────────────────────────────┐
        │      Common Layer              │
        │   ├─ Utilities                 │
        │   ├─ Exceptions                │
        │   └─ Guards                    │
        └────────────────────────────────┘
```

**Golden Rule:** Each layer can only import from layers below it. Higher layers cannot import from lower layers (prevents circular dependencies).

## Key Patterns

### 1. Repository Pattern

Domain defines repository interfaces; modules implement them.

```typescript
// domain/employee/repositories/employee.repository.interface.ts
export interface IEmployeeRepository {
  create(data: CreateEmployeeInput): Promise<Employee>
  findById(id: string): Promise<Employee | null>
}

// modules/employee/employee.service.ts
export class EmployeeService {
  constructor(private employeeRepository: IEmployeeRepository) {}
}
```

### 2. Service Delegation Pattern

Controllers delegate to services, services delegate to domain.

```
Controller → Module Service → Domain Service → Repository
```

### 3. DTO Pattern

Use DTOs for input validation and response shaping.

```typescript
// modules/employee/dto/create-employee.dto.ts
export class CreateEmployeeDto {
  @IsEmail()
  email: string

  @IsString()
  fullName: string
}
```

## Error Handling

Use the exception hierarchy in `src/common/exceptions/`:

```typescript
// ValidationException for input validation
throw new ValidationException('Email already exists')

// NotFoundException for missing resources
throw new NotFoundException('Employee', employeeId)

// BusinessLogicException for domain violations
throw new BusinessLogicException(
  'INSUFFICIENT_SALARY_COMPONENTS',
  'Cannot calculate payroll without salary components',
)
```

## Testing Strategy

### Unit Tests

- Test domain entities and services
- Test module services in isolation
- Location: `*.spec.ts` files

### Integration Tests

- Test API endpoints with real/mock database
- Location: `test/e2e/`

### Database Tests

- Use Prisma testing utilities
- Location: Database migration tests

## Import Best Practices

### ✅ DO

```typescript
// Import from absolute paths (configured in tsconfig)
import { EmployeeService } from '@src/modules/employee/services'
import { IEmployeeRepository } from '@src/domain/employee/repositories'
import { ValidationException } from '@src/common/exceptions'

// Import from barrels (index.ts)
import { EmployeeController } from './controllers'
```

### ❌ DON'T

```typescript
// Don't use relative paths beyond immediate parent
import { EmployeeService } from '../../../../modules/employee/services'

// Don't create circular dependencies
// Don't import implementation from domain in modules and vice versa
```

## Module Dependencies

```
modules/
  ├─ auth          (depends on: common, config, database, infra/logging)
  ├─ employee      (depends on: auth, common, config, database, domain/employee)
  ├─ payroll       (depends on: employee, domain/payroll, infra/queue)
  ├─ payslip       (depends on: payroll, common, database)
  ├─ salary-comp.  (depends on: domain/salary, database)
  ├─ tenant        (depends on: auth, common, database)
  ├─ users         (depends on: auth, common, config, database)
  └─ audit         (depends on: common, database, infra/logging)
```

## Future Improvements

1. **CQRS Pattern** - Separate read and write operations for complex queries
2. **Event Sourcing** - Track all changes for audit purposes
3. **Microservices** - If payroll processing becomes complex
4. **Caching Layer** - Redis integration for performance
5. **GraphQL** - Alternative to REST API
6. **API Versioning** - Support multiple API versions
7. **Webhooks** - External integrations for payroll events

## Code Review Checklist

- [ ] Code follows the directory structure
- [ ] Controller delegates to service
- [ ] Services use domain entities/interfaces
- [ ] DTOs used for all inputs
- [ ] Proper exception types used
- [ ] No circular dependencies
- [ ] Tests exist for new features
- [ ] Documentation updated

---

_Last Updated: February 18, 2026_
