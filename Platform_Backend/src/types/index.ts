export type UserRole =
  | 'user'
  | 'employee'
  | 'manager'
  | 'hr_admin'
  | 'org_admin'
  | 'Org_superadmin'
  | 'admin'
  | 'platform_admin'
  | 'super_admin'
  | 'support'

export interface PaginationQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
