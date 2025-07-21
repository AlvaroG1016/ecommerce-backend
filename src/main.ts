// lambda.ts - Nuevo archivo para el handler de Lambda
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Handler, Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as express from 'express';
import createServerlessExpress from '@vendia/serverless-express';

let cachedServer: any;

async function createServer() {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  const app = await NestFactory.create(AppModule, adapter);

  // VALIDACIÓN GLOBAL
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validateCustomDecorators: true,
  }));

  // CORS
  const frontendUrl = process.env.FRONTEND_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.enableCors({
    origin: isProduction ? [frontendUrl] : [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
  });

  // HEADERS DE SEGURIDAD BÁSICOS
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('X-Powered-By', '');
    }
    next();
  });

  // RATE LIMITING (más ligero para Lambda)
  if (isProduction) {
    // En Lambda, el rate limiting se maneja mejor con AWS API Gateway
    // Pero si quieres mantenerlo a nivel de aplicación:
    const { rateLimit } = await import('express-rate-limit');
    
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Para Lambda, es mejor usar un store en memoria o Redis
      // skip: (req) => req.headers['x-forwarded-for'] === undefined, // Skip si no viene de API Gateway
    });

    const paymentLimiter = rateLimit({
      windowMs: 5 * 60 * 1000,
      max: 10,
      message: {
        error: 'Payment rate limit exceeded',
        message: 'Too many payment attempts. Please wait before trying again.',
      },
    });

    app.use(limiter);
    app.use('/api/payment', paymentLimiter);
  }

  await app.init();
  
  cachedServer = createServerlessExpress({ app: expressApp });
  
  return cachedServer;
}

export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {

  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const server = await createServer();
    return await server(event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'An error occurred while processing the request',
      }),
    };
  }
};