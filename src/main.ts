import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import awsLambdaFastify from '@fastify/aws-lambda';
import type { Handler } from 'aws-lambda';

let cachedHandler: Handler;

async function createApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  await app.init();
  return app;
}

// Lambda handler
export const handler: Handler = async (event, context, callback) => {
  if (!cachedHandler) {
    const app = await createApp();
    cachedHandler = awsLambdaFastify(app.getHttpAdapter().getInstance());
  }
  return cachedHandler(event, context, callback);
};

// Local bootstrap
if (process.env.NODE_ENV !== 'production' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  (async () => {
    const app = await createApp();
    await app.listen(3000, '0.0.0.0');
    console.log(`🚀 Server running on http://localhost:3000`);
  })();
}
