import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class LoginAuthDto {
  @IsString()
  @ApiProperty({ example: 'tenantadmin@admin.com' })
  email!: string

  @IsString()
  @ApiProperty({ example: 'password' })
  password!: string
}
