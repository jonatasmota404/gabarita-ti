import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { CadastroDto, EntrarDto } from './dto/credenciais.dto.js';
import { Publico } from './publico.decorator.js';
import { UsuarioAtual, type UsuarioAutenticado } from './usuario-atual.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('cadastro')
  cadastrar(@Body() dto: CadastroDto) {
    return this.auth.cadastrar(dto);
  }

  @Publico()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('entrar')
  entrar(@Body() dto: EntrarDto) {
    return this.auth.entrar(dto);
  }

  @Get('eu')
  eu(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.auth.eu(usuario.id);
  }
}
