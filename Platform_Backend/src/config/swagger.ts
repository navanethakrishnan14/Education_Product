import swaggerJsdoc from 'swagger-jsdoc'
import env from './env'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trimsel API',
      version: '1.0.0',
      description:
        'REST API for Trimsel — Where Art Meets Digital Innovation. Covers authentication, user management, and more.',
      contact: {
        name: 'Trimsel Dev Team',
        email: 'dev@trimsel.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Local development server',
      },
      {
          url: `${process.env.RENDER_EXTERNAL_URL}/api/v1` || `http://localhost:${env.PORT}/api/v1`,
          description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token. Get it from POST /auth/login → accessToken',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
            errors: {
              type: 'array',
              items: { type: 'string' },
              example: ['field is required'],
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
