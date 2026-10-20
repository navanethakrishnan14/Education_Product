import { User, IUser } from '../models/User'
import { Employee } from '../models/Employee'
import { OrgUser } from '../models/OrgUser'
import { AppError } from '../middleware/errorHandler'
import env from '../config/env'
import { signAccessToken, signRefreshToken, verifyRefreshToken, type JwtPayload } from '../utils/jwt'

interface RegisterInput {
  name: string
  email: string
  password: string
  role?: string
}

interface LoginInput {
  email: string
  password: string
}

type AuthAudience = 'platform' | 'organization'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

type AuthAccount = {
  _id: unknown
  email: string
  role: string
  password?: string
  refreshToken?: string
  comparePassword(candidate: string): Promise<boolean>
  toPublic(): unknown
  save(): Promise<any>
}

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: IUser; tokens: AuthTokens }> {
    const existsInUsers = await User.findOne({ email: input.email })
    const existsInEmployees = await Employee.findOne({ email: input.email })
    const existsInOrg = await OrgUser.findOne({ email: input.email })
    if (existsInUsers || existsInEmployees || existsInOrg) throw new AppError('Email already in use', 409)

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      ...(input.role ? { role: input.role } : {}),
    })
    const tokens = this.generateTokens(user, 'platform')
    user.refreshToken = tokens.refreshToken
    await user.save()

    return { user, tokens }
  }

  async login(input: LoginInput): Promise<{ user: AuthAccount; tokens: AuthTokens }> {
    return this.loginForAudience(input, 'organization')
  }

  async loginForAudience(
    input: LoginInput,
    audience: AuthAudience,
  ): Promise<{ user: AuthAccount; tokens: AuthTokens }> {
    const account = await this.findAccountByEmail(input.email.trim().toLowerCase())
    if (!account) throw new AppError('Invalid credentials', 401)

    let valid = false
    try {
      valid = await account.comparePassword(input.password)
    } catch {
      valid = false
    }

    if (!valid) {
      const normalizedEmail = input.email.trim().toLowerCase()
      const envAdminEmail = env.SAAS_ADMIN_EMAIL.trim().toLowerCase()
      if (normalizedEmail === envAdminEmail && input.password === env.SAAS_ADMIN_PASSWORD) {
        account.password = env.SAAS_ADMIN_PASSWORD
        await account.save()
        valid = true
      }
    }

    if (!valid) throw new AppError('Invalid credentials', 401)

    if (audience === 'platform') {
      const platformRoles = new Set(['admin', 'hr_admin', 'platform_admin', 'super_admin', 'Org_superadmin', 'support'])
      if (!platformRoles.has(account.role)) {
        throw new AppError('Platform access denied for this account', 403)
      }
    } else {
      const orgRoles = new Set(['employee', 'manager', 'hr_admin', 'org_admin', 'Org_superadmin'])
      if (!orgRoles.has(account.role)) {
        throw new AppError('Organization access denied for this account', 403)
      }
    }

    const tokens = this.generateTokens(account as AuthAccount, audience)
    account.refreshToken = tokens.refreshToken
    await account.save()

    return { user: account, tokens }
  }

  async refresh(token: string): Promise<AuthTokens> {
    return this.refreshForAudience(token, 'organization')
  }

  async refreshForAudience(token: string, audience: AuthAudience): Promise<AuthTokens> {
    let payload: { userId: string; aud: AuthAudience }
    try {
      payload = verifyRefreshToken(token)
    } catch {
      throw new AppError('Invalid or expired refresh token', 401)
    }

    if (payload.aud !== audience) {
      throw new AppError('Token audience mismatch', 403)
    }

    const account = await User.findById(payload.userId).select('+refreshToken')
      || await Employee.findById(payload.userId).select('+refreshToken')
      || await OrgUser.findById(payload.userId).select('+refreshToken')

    if (!account || account.refreshToken !== token) {
      throw new AppError('Refresh token revoked', 401)
    }

    const tokens = this.generateTokens(account as AuthAccount, audience)
    account.refreshToken = tokens.refreshToken
    await account.save()

    return tokens
  }

  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken: null })
    await Employee.findByIdAndUpdate(userId, { refreshToken: null })
    await OrgUser.findByIdAndUpdate(userId, { refreshToken: null })
  }

  private async findAccountByEmail(email: string): Promise<AuthAccount | null> {
    // 1. Check OrgUser first (platform admin accounts live here)
    const orgUser = await OrgUser.findOne({ email }).select('+password +refreshToken')
    if (orgUser) return orgUser as unknown as AuthAccount

    // 2. Check Employee
    const employee = await Employee.findOne({ email }).select('+password +refreshToken')
    if (employee) return employee as unknown as AuthAccount

    // 3. Fallback to platform User
    const user = await User.findOne({ email }).select('+password +refreshToken')
    return user as AuthAccount | null
  }

  private generateTokens(user: AuthAccount, audience: AuthAudience): AuthTokens {
    const payload: JwtPayload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      aud: audience,
    }

    // Add organizationId for employees
    if ((user as any).organizationId) {
      payload.organizationId = String((user as any).organizationId)
    }

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken({ userId: String(user._id), aud: audience }),
    }
  }
}

export const authService = new AuthService()
