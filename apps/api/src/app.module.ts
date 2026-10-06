import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { validarEnv } from './config/env.js';
import { IngestModule } from './ingest/ingest.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { QuestoesModule } from './questoes/questoes.module.js';
import { RespostasModule } from './respostas/respostas.module.js';
import { SaudeController } from './saude.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env da raiz do monorepo (a API roda com cwd em apps/api); o ambiente tem precedência.
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
      validate: validarEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    IngestModule,
    AuthModule,
    QuestoesModule,
    RespostasModule,
  ],
  controllers: [SaudeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
