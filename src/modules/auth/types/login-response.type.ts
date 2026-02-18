export type SafeUser = {
  id: string
  email: string
  fullName: string
  role: string
  tenantId: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: SafeUser
}
