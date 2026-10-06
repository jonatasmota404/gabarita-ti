import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { UsuarioAtual, type UsuarioAutenticado } from '../auth/usuario-atual.decorator.js';
import { PaginacaoDto, ResponderDto } from './dto/responder.dto.js';
import { RespostasService } from './respostas.service.js';

@Controller()
export class RespostasController {
  constructor(private readonly respostas: RespostasService) {}

  @Post('questoes/:id/respostas')
  responder(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderDto,
  ) {
    return this.respostas.responder(usuario.id, id, dto.resposta);
  }

  @Get('desempenho')
  desempenho(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.respostas.desempenho(usuario.id);
  }

  @Get('historico')
  historico(@UsuarioAtual() usuario: UsuarioAutenticado, @Query() dto: PaginacaoDto) {
    return this.respostas.historico(usuario.id, dto.pagina, dto.porPagina);
  }
}
