import { ValidationPipe, type INestApplication } from '@nestjs/common';

/** Configuração HTTP compartilhada entre main.ts e os testes e2e. */
export function configurarApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
}
