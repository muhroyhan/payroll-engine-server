import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

/**
 * Refresh Token Request DTO
 *
 * Used to request a new access token using a valid refresh token
 */
export class RefreshDto {
  @ApiProperty({
    description: 'JWT refresh token issued at login or previous refresh',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}
