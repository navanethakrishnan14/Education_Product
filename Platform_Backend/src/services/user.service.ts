import mongoose from 'mongoose'
import { User, IUser } from '../models/User'
import { AppError } from '../middleware/errorHandler'
import type { PaginatedResult, PaginationQuery } from '../types'

interface UpdateProfileInput {
  name?: string
  avatarUrl?: string | null
}

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export class UserService {
  async getById(id: string): Promise<IUser> {
    const user = await User.findById(id)
    if (!user) throw new AppError('User not found', 404)
    return user
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<IUser> {
    const user = await User.findByIdAndUpdate(id, input, { new: true, runValidators: true })
    if (!user) throw new AppError('User not found', 404)
    return user
  }

  async changePassword(id: string, input: ChangePasswordInput): Promise<void> {
    const user = await User.findById(id).select('+password')
    if (!user) throw new AppError('User not found', 404)

    const valid = await user.comparePassword(input.currentPassword)
    if (!valid) throw new AppError('Current password is incorrect', 400)

    user.password = input.newPassword
    await user.save()
  }

  async deleteAccount(id: string): Promise<void> {
    const result = await User.findByIdAndDelete(id)
    if (!result) throw new AppError('User not found', 404)
  }

  // ── Admin ──────────────────────────────────────────────────────────

  async listUsers(
    query: PaginationQuery & { search?: string }
  ): Promise<PaginatedResult<IUser>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = query

    const filter = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
      : {}

    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  private buildIdQuery(id: string) {
    const isValidMongoId = mongoose.Types.ObjectId.isValid(id)
    if (isValidMongoId) {
      return { $or: [{ _id: id }, { employeeId: id }] }
    }
    return { employeeId: id }
  }

  private async findByIdOrEmployeeId(id: string): Promise<IUser | null> {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const byId = await User.findById(id)
      if (byId) return byId
    }

    return await User.findOne({ employeeId: id })
  }

  async adminGetUser(id: string): Promise<IUser> {
    const user = await this.findByIdOrEmployeeId(id)
    if (!user) throw new AppError('User not found', 404)
    return user
  }

  async adminUpdateUser(id: string, input: Partial<IUser>): Promise<IUser> {
    const query = this.buildIdQuery(id)
    const user = await User.findOneAndUpdate(query, input, { new: true, runValidators: true })
    if (!user) throw new AppError('User not found', 404)
    return user
  }

  async adminDeleteUser(id: string): Promise<void> {
    const query = this.buildIdQuery(id)
    const result = await User.findOneAndDelete(query)
    if (!result) throw new AppError('User not found', 404)
  }
}

export const userService = new UserService()
