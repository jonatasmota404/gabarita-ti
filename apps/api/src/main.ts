import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  configurarApp(app);
  const origens = config.get('CORS_ORIGINS', { infer: true });
  if (origens.length) app.enableCors({ origin: origens });
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
