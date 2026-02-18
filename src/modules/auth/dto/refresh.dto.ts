import { IsNotEmpty, IsString } from 'class-validator'

/**
 * Refresh Token Request DTO
 *
 * Used to request a new access token using a valid refresh token
 */
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}
