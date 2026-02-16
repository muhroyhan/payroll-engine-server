import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsStrongPassword } from 'class-validator'

export class LoginAuthDto {
  @IsEmail()
  @ApiProperty({ example: 'tenantadmin@admin.com' })
  email!: string

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  @ApiProperty({ example: 'password' })
  password!: string
}
