import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { Sessao, Usuario } from '@gabarita/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CadastroDto, EntrarDto } from './dto/credenciais.dto.js';

// argon2id com parâmetros acima do mínimo recomendado pela OWASP (19 MiB, t=2).
const ARGON2 = { memoryCost: 19_456, timeCost: 3, parallelism: 1 } as const;

@Injectable()
export class AuthService {
  /** Hash de referência para gastar o mesmo tempo quando o e-mail não existe. */
  private hashFalso?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async cadastrar(dto: CadastroDto): Promise<Sessao> {
    const senhaHash = await hash(dto.senha, ARGON2);
    try {
      const usuario = await this.prisma.usuario.create({
        data: { email: dto.email, senhaHash, nome: dto.nome || null },
      });
      return this.sessao(usuario);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Já existe uma conta com este e-mail');
      }
      throw err;
    }
  }

  async entrar(dto: EntrarDto): Promise<Sessao> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    this.hashFalso ??= hash('senha-que-nao-existe', ARGON2);
    const ok = await verify(usuario?.senhaHash ?? (await this.hashFalso), dto.senha);
    if (!usuario || !ok) throw new UnauthorizedException('E-mail ou senha incorretos');
    return this.sessao(usuario);
  }

  async eu(id: string): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new UnauthorizedException();
    return this.paraDto(usuario);
  }

  private async sessao(usuario: { id: string; email: string; nome: string | null }) {
    return { token: await this.jwt.signAsync({ sub: usuario.id }), usuario: this.paraDto(usuario) };
  }

  private paraDto(u: { id: string; email: string; nome: string | null }): Usuario {
    return { id: u.id, email: u.email, nome: u.nome };
  }
}
