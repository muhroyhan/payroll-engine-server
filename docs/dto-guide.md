# DTO Organization Guide

This document explains how to organize and create Data Transfer Objects (DTOs) for your modules.

## What are DTOs?

DTOs (Data Transfer Objects) are classes used to validate and shape data flowing in and out of your API endpoints. They serve as contracts between client and server.

## DTO Types

### 1. **Create DTOs** - For POST requests

```typescript
// modules/employee/dto/create-employee.dto.ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator'

export class CreateEmployeeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string

  @IsString()
  @IsNotEmpty()
  fullName: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsString()
  @IsOptional()
  address?: string

  @Min(18)
  @Max(65)
  @IsOptional()
  age?: number
}
```

### 2. **Update DTOs** - For PATCH/PUT requests

```typescript
// modules/employee/dto/update-employee.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreateEmployeeDto } from './create-employee.dto'

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
```

### 3. **Response DTOs** - For shaping API responses

```typescript
// modules/employee/dto/employee-response.dto.ts
import { Exclude, Transform } from 'class-transformer'

export class EmployeeResponseDto {
  id: string
  email: string
  fullName: string
  phone?: string
  address?: string

  @Transform(({ value }) => new Date(value).toISOString())
  createdAt: Date

  @Exclude() // Don't include in responses
  password: string
}
```

### 4. **Query DTOs** - For GET query parameters

```typescript
// modules/employee/dto/query-employee.dto.ts
import { IsOptional, IsString, IsNumber, Type } from 'class-validator'

export class QueryEmployeeDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number = 0
}
```

## Validation Decorators

### Common Validators

```typescript
import {
  // String validators
  IsString,
  IsEmail,
  IsUrl,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  Matches,

  // Number validators
  IsNumber,
  Min,
  Max,
  IsPositive,
  IsNegative,

  // Date validators
  IsDate,
  IsBefore,
  IsAfter,

  // Array validators
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayContains,

  // General validators
  IsNotEmpty,
  IsOptional,
  IsDefined,
  Equals,
  IsEnum,
  IsBoolean,

  // Type validators
  IsInstance,
  ValidateNested,

  // Custom validators
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
} from 'class-validator'
```

### Example with Multiple Validators

```typescript
export class CreateSalaryComponentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Code must contain only uppercase letters, numbers, and underscores',
  })
  code: string

  @IsNumber()
  @IsPositive()
  amount: number

  @IsEnum(['FIXED', 'PERCENTAGE'])
  type: 'FIXED' | 'PERCENTAGE'

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isDeductible?: boolean
}
```

## Custom Validators

Create reusable validators for domain-specific logic:

```typescript
// common/validators/unique-email.validator.ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationOptions,
  registerDecorator,
} from 'class-validator'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@src/database/prisma.service'

@ValidatorConstraint({ name: 'isEmailUnique', async: true })
@Injectable()
export class IsEmailUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    return !user // Return false if user exists
  }

  defaultMessage() {
    return 'Email is already registered'
  }
}

// Decorator
export function IsEmailUnique(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailUniqueConstraint,
    })
  }
}

// Usage in DTO
export class CreateUserDto {
  @IsEmail()
  @IsEmailUnique() // Custom validator
  email: string
}
```

## DTO File Organization

### Structure for each module

```
modules/your-module/dto/
├── create-your-module.dto.ts
├── update-your-module.dto.ts
├── your-module-response.dto.ts
├── query-your-module.dto.ts
└── index.ts
```

### Barrel Export (index.ts)

```typescript
// modules/employee/dto/index.ts
export * from './create-employee.dto'
export * from './update-employee.dto'
export * from './employee-response.dto'
export * from './query-employee.dto'
```

### Using in Controllers

```typescript
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto'

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto)
  }

  @Get()
  findAll(@Query() query: QueryEmployeeDto) {
    return this.employeeService.findAll(query)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(id, updateEmployeeDto)
  }
}
```

## Best Practices

### 1. **Validation First**

Always validate on the DTO level, not in service:

✅ GOOD:

```typescript
// Validation happens automatically in NestJS
@Post()
create(@Body() createEmployeeDto: CreateEmployeeDto) {
  // createEmployeeDto is already validated
  return this.employeeService.create(createEmployeeDto);
}
```

❌ BAD:

```typescript
@Post()
create(@Body() data: any) {
  if (!data.email) throw new Error('Email required'); // Manual validation
  return this.employeeService.create(data);
}
```

### 2. **Separate Concerns**

Use different DTOs for different purposes:

```typescript
// CreateEmployeeDto - for input validation
// EmployeeResponseDto - for output formatting
// QueryEmployeeDto - for query parameters
```

### 3. **Reuse with PartialType**

Use Mapped-types for Update DTOs:

```typescript
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
// All fields become optional automatically
```

### 4. **Document with Comments**

```typescript
export class CreatePayrollDto {
  /**
   * Employee ID to process payroll for
   * @example "emp_123456"
   */
  @IsString()
  @IsNotEmpty()
  employeeId: string

  /**
   * Payroll period start date
   * @example "2024-01-01"
   */
  @IsDate()
  @IsNotEmpty()
  startDate: Date
}
```

### 5. **Use Enums for Fixed Values**

```typescript
export enum SalaryComponentType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
  DYNAMIC = 'DYNAMIC',
}

export class CreateSalaryComponentDto {
  @IsEnum(SalaryComponentType)
  type: SalaryComponentType
}
```

## Advanced Patterns

### Nested DTOs with Validation

```typescript
export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string

  @IsString()
  @IsNotEmpty()
  city: string

  @IsString()
  @IsNotEmpty()
  zipCode: string
}

export class CreateEmployeeWithAddressDto {
  @IsString()
  email: string

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto
}
```

### Conditionally Required Fields

```typescript
import { ValidateIf } from 'class-validator'

export class UpdatePayrollDto {
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'APPROVED' | 'REJECTED'

  @ValidateIf((o) => o.status === 'REJECTED')
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string // Required only if status is REJECTED
}
```

## Testing DTOs

```typescript
import { validate } from 'class-validator'
import { CreateEmployeeDto } from './create-employee.dto'

describe('CreateEmployeeDto', () => {
  it('should validate correct dto', async () => {
    const dto = new CreateEmployeeDto()
    dto.email = 'test@example.com'
    dto.fullName = 'John Doe'

    const errors = await validate(dto)
    expect(errors).toHaveLength(0)
  })

  it('should fail with invalid email', async () => {
    const dto = new CreateEmployeeDto()
    dto.email = 'invalid-email'
    dto.fullName = 'John Doe'

    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })
})
```

---

See [Module Structure Guide](./module-structure.md) for more information about organizing your modules.
