export type JwtPayload = {
  sub: string // user_id
  tenantId: string
  role: string
  email: string
}
