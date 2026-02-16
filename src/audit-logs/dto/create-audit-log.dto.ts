import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class CreateAuditLogDto {
  @IsString()
  @ApiProperty({ example: 'create user' })
  action!: string

  @IsString()
  @ApiProperty({ example: 'Users' })
  entity!: string

  @IsString()
  @ApiProperty({ example: 'User' })
  entityType!: string

  @IsString()
  @ApiProperty({ example: '1' })
  entityId!: string
}
