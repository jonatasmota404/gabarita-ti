import { createReadStream } from 'node:fs';
import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ListarQuestoesDto } from './dto/listar-questoes.dto.js';
import { QuestoesService } from './questoes.service.js';

@Controller('questoes')
export class QuestoesController {
  constructor(private readonly questoes: QuestoesService) {}

  @Get()
  listar(@Query() dto: ListarQuestoesDto) {
    return this.questoes.listar(dto);
  }

  @Get('filtros')
  filtros() {
    return this.questoes.filtros();
  }

  @Get(':id')
  detalhar(@Param('id', ParseIntPipe) id: number) {
    return this.questoes.detalhar(id);
  }

  @Get(':id/recortes/:recorteId')
  @Header('Cache-Control', 'private, max-age=86400')
  async recorte(
    @Param('id', ParseIntPipe) id: number,
    @Param('recorteId', ParseIntPipe) recorteId: number,
  ) {
    const { caminho, contentType } = await this.questoes.arquivoRecorte(id, recorteId);
    return new StreamableFile(createReadStream(caminho), {
      type: contentType,
      disposition: 'inline',
    });
  }
}
