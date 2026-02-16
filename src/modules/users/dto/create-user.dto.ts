import { ApiProperty } from '@nestjs/swagger'
import { $Enums } from '@prismaclient/client'
import { IsEnum, IsInt, IsString } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @ApiProperty({ example: 'tenantadmin@admin.com' })
  email!: string

  @IsString()
  @ApiProperty({ example: 'password' })
  password!: string

  @IsString()
  @ApiProperty({ example: 'tenant admin' })
  fullName!: string

  @IsEnum($Enums.Role)
  @ApiProperty({ example: $Enums.Role.tenant_admin })
  role?: $Enums.Role

  @IsInt()
  @ApiProperty({ example: 1 })
  isActive?: boolean
}
