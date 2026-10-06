import { Module } from '@nestjs/common';
import { RespostasController } from './respostas.controller.js';
import { RespostasService } from './respostas.service.js';

@Module({ controllers: [RespostasController], providers: [RespostasService] })
export class RespostasModule {}
