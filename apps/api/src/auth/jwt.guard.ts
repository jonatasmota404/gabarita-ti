import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env.js';
import { UsuarioLocalService } from './usuario-local.service.js';
import { ROTA_PUBLICA } from './publico.decorator.js';
import type { RequestAutenticada } from './usuario-atual.decorator.js';

/**
 * Guard global. Modo jwt: exige `Authorization: Bearer <jwt>` exceto em rotas @Publico().
 * Modo local: ignora o token e atribui o usuário local fixo a toda requisição.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService<Env, true>,
    private readonly local: UsuarioLocalService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const publico = this.reflector.getAllAndOverride<boolean>(ROTA_PUBLICA, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<RequestAutenticada>();
    if (this.config.get('AUTH_MODE', { infer: true }) === 'local') {
      req.usuario = { id: await this.local.id() };
      return true;
    }
    if (publico) return true;

    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.usuario = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
