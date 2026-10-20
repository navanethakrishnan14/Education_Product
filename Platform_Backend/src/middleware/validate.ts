import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { sendError } from '../utils/apiResponse'

type Source = 'body' | 'query' | 'params'

export function validate(schema: Joi.ObjectSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true })
    if (error) {
      const errors = error.details.map((d) => d.message)
      sendError(res, 422, 'Validation failed', errors)
      return
    }
    req[source] = value
    next()
  }
}
