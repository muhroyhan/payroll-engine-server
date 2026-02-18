import { Injectable } from '@nestjs/common'
import { CreateUserDto } from '../dto/create-user.dto'
import { UpdateUserDto } from '../dto/update-user.dto'
import { PrismaService } from '@src/database/prisma.service'
import { $Enums, Prisma, User } from '@prismaclient/client'
import { genSalt, hash } from 'bcryptjs'
import { SALT } from '@src/constants'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateUserDto) {
    const salt = await genSalt(SALT)
    const password = await hash(input.password, salt)
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    })
    if (user) {
      throw new Error('User already exists')
    }
    const data: Prisma.UserCreateInput = {
      email: input.email,
      fullName: input.fullName,
      isActive: true,
      password,
      role: input.role || $Enums.Role.viewer,
      tenant: {},
      createdBy: '',
      updatedBy: '',
    }
    return this.prisma.user.create({ data })
  }

  findAll(params?: {
    where?: {
      email?: string
      fullName?: string
      role?: $Enums.Role
      isActive?: boolean
    }
    orderBy?: {
      updatedAt?: 'asc' | 'desc'
      fullName?: 'asc' | 'desc'
      email?: 'asc' | 'desc'
      role?: 'asc' | 'desc'
    }
  }): Promise<User[]> {
    return this.prisma.user.findMany(params)
  }

  findOne(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({ where: userWhereUniqueInput })
  }

  async update(params: {
    data: UpdateUserDto
    where: Prisma.UserWhereUniqueInput
  }) {
    let password = params.data.password

    // Hash password if provided
    if (password) {
      const salt = await genSalt(SALT)
      password = await hash(password, salt)
    }

    const data: Prisma.UserUpdateInput = {
      email: params.data.email,
      fullName: params.data.fullName,
      isActive: params.data.isActive || true,
      ...(password && { password }),
      role: params.data.role || $Enums.Role.viewer,
      tenant: {},
      createdBy: '',
      updatedBy: '',
    }
    return this.prisma.user.update({ data, where: params.where })
  }

  remove(id: string) {
    return this.prisma.user.delete({ where: { id } })
  }
}
