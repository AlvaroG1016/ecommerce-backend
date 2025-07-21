import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //  VALIDACIÓN GLOBAL
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validateCustomDecorators: true,
  }));

  //  CORS 
  const frontendUrl = process.env.FRONTEND_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.enableCors({
    origin: isProduction 
      ? [frontendUrl] 
      : [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
  });

  //  HEADERS DE SEGURIDAD BÁSICOS
  app.use((req, res, next) => {
    // Headers mínimos para OWASP
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('X-Powered-By', ''); 
    }
    
    next();
  });

  //  RATE LIMITING 
  if (isProduction) {
    const { rateLimit } = await import('express-rate-limit');
    
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // 100 requests por IP
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Rate limiting más estricto para pagos
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  

}

bootstrap();