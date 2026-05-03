import { AbilityFactory } from './ability.factory'

describe('AbilityFactory', () => {
  const factory = new AbilityFactory()

  it('returns unrestricted scope for superadmin', () => {
    const where = factory.buildUserWhere(
      { role: 'superadmin', tenantId: null },
      'read',
    )

    expect(where).toBeNull()
  })

  it('returns tenant-scoped read filter for viewer', () => {
    const where = factory.buildUserWhere(
      { role: 'viewer', tenantId: 7 },
      'read',
    )

    expect(where).toEqual({ tenantId: 7 })
  })

  it('returns denied filter for viewer manage action', () => {
    const where = factory.buildTenantWhere(
      { role: 'viewer', tenantId: 7 },
      'manage',
    )

    expect(where).toEqual({ id: -1 })
  })
})
