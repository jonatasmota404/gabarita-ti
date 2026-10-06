import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { IngestRepository } from './ingest.repository.js';
import { PgIngestRepository } from './pg-ingest.repository.js';

/**
 * Único ponto do app que conhece o banco do ingest. Exporta a porta abstrata
 * IngestRepository; a implementação Postgres fica escondida aqui.
 */
@Global()
@Module({
  providers: [
    {
      provide: IngestRepository,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new PgIngestRepository(config.get('INGEST_DATABASE_URL', { infer: true })),
    },
  ],
  exports: [IngestRepository],
})
export class IngestModule {}
