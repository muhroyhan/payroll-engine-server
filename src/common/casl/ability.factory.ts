import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability'
import { Injectable } from '@nestjs/common'
import type { AuthUser } from '@src/common/types'

export type AppAction = 'manage' | 'read'
export type AppSubject = 'all'
export type AppAbility = MongoAbility<[AppAction, AppSubject]>

@Injectable()
export class AbilityFactory {
  createForUser(user: AuthUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    if (user.role === 'superadmin') {
      can('manage', 'all')
      return build()
    }

    if (user.role === 'viewer') {
      can('read', 'all')
      return build()
    }

    can('manage', 'all')
    can('read', 'all')

    return build()
  }
}
