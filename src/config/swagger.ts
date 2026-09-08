import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

// This builds the OpenAPI spec that powers the interactive Swagger UI at
// /api-docs. Instead of writing the whole spec by hand in one giant file,
// swagger-jsdoc reads specially-formatted comment blocks (starting with
// "@openapi") directly above each route in src/routes/*, and stitches them
// together with the shared config below (title, servers, reusable schemas).
// Keeping the docs next to the route they describe makes them much more
// likely to stay up to date when a route changes.

const PORT = process.env.PORT || 3000;

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: 'User Management API',
    version: '1.0.0',
    description:
      'A Node.js + Express + TypeScript backend for managing users, authentication, ' +
      'profile picture uploads, and a per-user todo board.',
  },
  servers: [{ url: `http://localhost:${PORT}`, description: 'Local server' }],
  components: {
    // Defines how to send an access token in Swagger UI's "Authorize"
    // button: as a "Authorization: Bearer <token>" header. Routes opt into
    // requiring it via `security: [{ bearerAuth: [] }]` in their own doc block.
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    // Shared shapes referenced from multiple route doc blocks via $ref, so
    // we don't repeat the same field list on every endpoint that touches a
    // user or a task.
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6512f1f5c2a1b2a1e4d5f6a7' },
          username: { type: 'string', example: 'alice' },
          email: { type: 'string', example: 'alice@example.com' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          isDeleted: { type: 'boolean', example: false },
          profilePicture: { type: 'string', nullable: true, example: '/uploads/abc123.png' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUserInput: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', example: 'alice' },
          email: { type: 'string', example: 'alice@example.com' },
          password: {
            type: 'string',
            format: 'password',
            example: 'Str0ng!Pass',
            description: 'At least 8 characters, with uppercase, lowercase, a number, and a symbol.',
          },
          role: { type: 'string', enum: ['user', 'admin'], default: 'user' },
        },
      },
      UpdateUserInput: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string', format: 'password' },
          role: { type: 'string', enum: ['user', 'admin'] },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'alice' },
          password: { type: 'string', format: 'password', example: 'Str0ng!Pass' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'Short-lived JWT (15 minutes).' },
          refreshToken: { type: 'string', description: 'Long-lived JWT (15 days).' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RefreshTokenInput: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string', example: 'Write report' },
          description: { type: 'string', example: 'Quarterly report', nullable: true },
          status: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string', enum: ['Backlog', 'Todo', 'InProgress', 'Completed'] },
            },
          },
          assigned_to: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTaskInput: {
        type: 'object',
        required: ['title', 'assigned_to'],
        properties: {
          title: { type: 'string', example: 'Write report' },
          description: { type: 'string', example: 'Quarterly report' },
          assigned_to: { type: 'string', description: 'A user id.' },
          status: {
            type: 'string',
            enum: ['Backlog', 'Todo', 'InProgress', 'Completed'],
            description: 'Defaults to "Backlog" if omitted.',
          },
        },
      },
      UpdateTaskStatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['Backlog', 'Todo', 'InProgress', 'Completed'] },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Something went wrong' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: { type: 'string' },
            example: ['username is required'],
          },
        },
      },
    },
  },
};

const options: swaggerJsdoc.OAS3Options = {
  definition: swaggerDefinition,
  // Looks for "@openapi" comment blocks in route files. Both extensions are
  // listed so this works whether the app is running from source with
  // ts-node-dev (.ts) or from the compiled build with `node dist/server.js`
  // (.js) — whichever pattern doesn't match any real files is simply ignored.
  apis: [
    path.join(__dirname, '..', 'routes', '*.ts'),
    path.join(__dirname, '..', 'routes', '*.js'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
