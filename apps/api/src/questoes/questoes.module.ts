import { Module } from '@nestjs/common';
import { QuestoesController } from './questoes.controller.js';
import { QuestoesService } from './questoes.service.js';

@Module({ controllers: [QuestoesController], providers: [QuestoesService] })
export class QuestoesModule {}
