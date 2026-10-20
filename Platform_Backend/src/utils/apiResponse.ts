import { Response } from 'express'

interface SuccessPayload<T> {
  success: true
  message: string
  data?: T
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface ErrorPayload {
  success: false
  message: string
  errors?: string[] | Record<string, string>
}

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  pagination?: SuccessPayload<T>['pagination']
): Response {
  const body: SuccessPayload<T> = { success: true, message, ...(data !== undefined && { data }) }
  if (pagination) body.pagination = pagination
  return res.status(statusCode).json(body)
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  errors?: string[] | Record<string, string>
): Response {
  const body: ErrorPayload = { success: false, message, ...(errors && { errors }) }
  return res.status(statusCode).json(body)
}
