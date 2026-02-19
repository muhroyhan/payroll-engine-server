# Database Structure

PostgreSQL database managed by **Prisma ORM** with a single migration file at `prisma/migrations/`.  
All monetary fields use `Decimal(15, 2)` to avoid floating-point precision errors.  
All tables include `createdAt`, `createdBy`, `updatedAt`, `updatedBy` audit columns.

---

## Entity Relationship Overview

```
Tenant
  ├── User (many)
  ├── Employee (many)
  ├── SalaryComponent (many)
  ├── EmployeeSalaryComponent (many)
  ├── AuditLogs (many)
  ├── PayslipPeriod (many)
  │     └── PayslipRun (many)
  │           └── Payslip (many)
  │                 └── PayslipItem (many)
  └── Payslip (many)

Employee
  └── EmployeeSalaryComponent (many)
  └── Payslip (many)

User
  └── AuditLogs (many)
  └── PayslipRun (many)
```

---

## Tables

### `Tenant`

Root entity. Every record in the system belongs to a tenant (multi-tenancy).

| Column    | Type     | Notes                  |
| --------- | -------- | ---------------------- |
| id        | String   | UUID, PK               |
| name      | String   | Display name           |
| code      | String   | Unique identifier code |
| createdAt | DateTime |                        |
| createdBy | String   |                        |
| updatedAt | DateTime | Auto-updated           |
| updatedBy | String   |                        |

**Indexes:** unique on `code`

---

### `User`

System users who can log in. Scoped to a tenant.

| Column       | Type     | Notes                                           |
| ------------ | -------- | ----------------------------------------------- |
| id           | String   | UUID, PK                                        |
| tenantId     | String   | FK → Tenant                                     |
| email        | String   | Unique across all tenants                       |
| password     | String   | bcrypt hash                                     |
| fullName     | String   |                                                 |
| role         | Role     | enum: tenant_admin / payroll_officer / viewer   |
| isActive     | Boolean  | Default true                                    |
| refreshToken | String?  | SHA-256 hex digest of last issued refresh token |
| createdAt    | DateTime |                                                 |
| createdBy    | String   |                                                 |
| updatedAt    | DateTime | Auto-updated                                    |
| updatedBy    | String   |                                                 |

**Indexes:** `(tenantId)`, `(tenantId, isActive)`

---

### `AuditLogs`

Immutable record of every significant action taken in the system.

| Column      | Type     | Notes                             |
| ----------- | -------- | --------------------------------- |
| id          | String   | UUID, PK                          |
| tenantId    | String   | FK → Tenant                       |
| actorUserId | String   | FK → User (who did the action)    |
| action      | String   | e.g. `CREATE`, `UPDATE`, `DELETE` |
| entity      | String   | e.g. `Employee`                   |
| entityType  | String   | Additional type context           |
| entityId    | String   | ID of the affected record         |
| beforeData  | Json?    | Snapshot before change            |
| afterData   | Json?    | Snapshot after change             |
| createdAt   | DateTime |                                   |

**Indexes:** `(tenantId)`, `(tenantId, actorUserId)`, `(tenantId, createdAt)`

---

### `Employee`

An employee within a tenant.

| Column       | Type          | Notes                          |
| ------------ | ------------- | ------------------------------ |
| id           | String        | UUID, PK                       |
| tenantId     | String        | FK → Tenant                    |
| employeeCode | String        | Unique employee code           |
| fullName     | String        |                                |
| position     | String        |                                |
| employeeType | EmployeeType  | enum: `permanent` / `contract` |
| baseSalary   | Decimal(15,2) |                                |
| joinDate     | DateTime      |                                |
| isActive     | Boolean       | Default true                   |
| createdAt    | DateTime      |                                |
| createdBy    | String        |                                |
| updatedAt    | DateTime      | Auto-updated                   |
| updatedBy    | String        |                                |

**Indexes:** `(tenantId)`, `(tenantId, isActive)`, unique on `employeeCode`

---

### `SalaryComponent`

Template salary components defined by a tenant (e.g. Transport Allowance, BPJS Deduction).

| Column          | Type            | Notes                                 |
| --------------- | --------------- | ------------------------------------- |
| id              | String          | UUID, PK                              |
| tenantId        | String          | FK → Tenant                           |
| name            | String          |                                       |
| type            | SalaryType      | enum: `allowance` / `deduction`       |
| calculationType | CalculationType | enum: `fixed` / `percentage`          |
| defaultValue    | Decimal(15,2)   | Fixed amount or percentage rate       |
| isTaxable       | Boolean         | Whether subject to tax. Default false |
| isActive        | Boolean         | Default true                          |
| createdAt       | DateTime        |                                       |
| createdBy       | String          |                                       |
| updatedAt       | DateTime        | Auto-updated                          |
| updatedBy       | String          |                                       |

**Indexes:** `(tenantId)`, `(tenantId, isActive)`

---

### `EmployeeSalaryComponent`

Per-employee salary component assignment, copied from `SalaryComponent` template but can be customized per employee.

| Column          | Type            | Notes                           |
| --------------- | --------------- | ------------------------------- |
| id              | String          | UUID, PK                        |
| employeeId      | String          | FK → Employee                   |
| tenantId        | String          | FK → Tenant                     |
| name            | String          |                                 |
| type            | SalaryType      | enum: `allowance` / `deduction` |
| calculationType | CalculationType | enum: `fixed` / `percentage`    |
| defaultValue    | Decimal(15,2)   |                                 |
| isTaxable       | Boolean         | Default false                   |
| isActive        | Boolean         | Default true                    |
| createdAt       | DateTime        |                                 |
| createdBy       | String          |                                 |
| updatedAt       | DateTime        | Auto-updated                    |
| updatedBy       | String          |                                 |

**Indexes:** `(tenantId)`, `(employeeId)`

---

### `PayslipPeriod`

Defines a payroll period (e.g. January 2026).

| Column       | Type                | Notes                                  |
| ------------ | ------------------- | -------------------------------------- |
| id           | String              | UUID, PK                               |
| tenantId     | String              | FK → Tenant                            |
| name         | String              | e.g. `January 2026`                    |
| period_start | DateTime            |                                        |
| period_end   | DateTime            |                                        |
| status       | PayslipPeriodStatus | enum: `draft` / `processed` / `locked` |
| createdAt    | DateTime            |                                        |
| createdBy    | String              |                                        |
| updatedAt    | DateTime            | Auto-updated                           |
| updatedBy    | String              |                                        |

**Indexes:** `(tenantId)`, `(tenantId, status)`

---

### `PayslipRun`

A payroll run execution within a payslip period. Records summary totals.

| Column          | Type          | Notes                   |
| --------------- | ------------- | ----------------------- |
| id              | String        | UUID, PK                |
| payslipPeriodId | String        | FK → PayslipPeriod      |
| runByUserId     | String        | FK → User               |
| tenantId        | String        | FK → Tenant             |
| grossSalary     | Decimal(15,2) | Total gross for the run |
| totalDeductions | Decimal(15,2) |                         |
| netSalary       | Decimal(15,2) |                         |
| createdAt       | DateTime      |                         |
| createdBy       | String        |                         |
| updatedAt       | DateTime      | Auto-updated            |
| updatedBy       | String        |                         |

**Indexes:** `(tenantId)`, `(tenantId, payslipPeriodId)`

---

### `Payslip`

Individual payslip per employee per run.

| Column         | Type          | Notes           |
| -------------- | ------------- | --------------- |
| id             | String        | UUID, PK        |
| payslipRunId   | String        | FK → PayslipRun |
| employeeId     | String        | FK → Employee   |
| tenantId       | String        | FK → Tenant     |
| baseSalary     | Decimal(15,2) |                 |
| grossSalary    | Decimal(15,2) |                 |
| totalAllowance | Decimal(15,2) |                 |
| totalDeduction | Decimal(15,2) |                 |
| netSalary      | Decimal(15,2) |                 |
| createdAt      | DateTime      |                 |
| createdBy      | String        |                 |
| updatedAt      | DateTime      | Auto-updated    |
| updatedBy      | String        |                 |

**Indexes:** `(tenantId)`, `(tenantId, employeeId)`, `(payslipRunId)`

---

### `PayslipItem`

Line items within a payslip (each salary component applied).

| Column        | Type          | Notes                           |
| ------------- | ------------- | ------------------------------- |
| id            | String        | UUID, PK                        |
| payslipId     | String        | FK → Payslip                    |
| componentName | String        | Snapshot name at time of run    |
| componentType | SalaryType    | enum: `allowance` / `deduction` |
| amount        | Decimal(15,2) |                                 |
| createdAt     | DateTime      |                                 |
| createdBy     | String        |                                 |
| updatedAt     | DateTime      | Auto-updated                    |
| updatedBy     | String        |                                 |

**Indexes:** `(payslipId)`

---

## Enums

| Enum                  | Values                                      |
| --------------------- | ------------------------------------------- |
| `Role`                | `tenant_admin`, `payroll_officer`, `viewer` |
| `EmployeeType`        | `permanent`, `contract`                     |
| `SalaryType`          | `allowance`, `deduction`                    |
| `CalculationType`     | `fixed`, `percentage`                       |
| `PayslipPeriodStatus` | `draft`, `processed`, `locked`              |
