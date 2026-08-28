import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EventDecor API Documentation',
      version: '1.0.0',
      description: 'API documentation for the EventDecor enterprise platform.',
    },
    servers: [
      {
        url: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/v1`
          : 'http://localhost:5000/api/v1',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/**/*.ts', './src/models/*.ts', './src/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
