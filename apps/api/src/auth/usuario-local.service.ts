import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const EMAIL_USUARIO_LOCAL = 'local@gabarita.ti';
/** Não é um hash argon2: nenhuma senha confere, então não dá para entrar como este usuário. */
const SEM_SENHA = '!sem-senha';

/** Garante (uma vez por processo) o usuário fixo que é dono das respostas no modo local. */
@Injectable()
export class UsuarioLocalService {
  private pendente?: Promise<string>;

  constructor(private readonly prisma: PrismaService) {}

  id(): Promise<string> {
    this.pendente ??= this.prisma.usuario
      .upsert({
        where: { email: EMAIL_USUARIO_LOCAL },
        update: {},
        create: { email: EMAIL_USUARIO_LOCAL, senhaHash: SEM_SENHA, nome: 'Usuário local' },
      })
      .then((u) => u.id)
      .catch((err: unknown) => {
        this.pendente = undefined; // tenta de novo na próxima requisição
        throw err;
      });
    return this.pendente;
  }
}
