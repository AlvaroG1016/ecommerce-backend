import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import awsLambdaFastify from '@fastify/aws-lambda';
import type { Handler } from 'aws-lambda';

let cachedHandler: Handler;

async function bootstrap(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;

  const adapter = new FastifyAdapter();
  const app = await NestFactory.create(AppModule, adapter);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors();

  await app.init();
  cachedHandler = awsLambdaFastify(adapter.getInstance());
  return cachedHandler;
}

export const handler: Handler = async (event, context, callback) => {
  const server = await bootstrap();
  return server(event, context, callback);
};
