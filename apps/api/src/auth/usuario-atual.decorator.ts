import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface UsuarioAutenticado {
  id: string;
}

export type RequestAutenticada = Request & { usuario?: UsuarioAutenticado };

export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<RequestAutenticada>().usuario!,
);
