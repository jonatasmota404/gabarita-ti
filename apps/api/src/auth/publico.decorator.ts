import { SetMetadata } from '@nestjs/common';

export const ROTA_PUBLICA = 'rotaPublica';
/** Libera a rota do JwtGuard global. */
export const Publico = () => SetMetadata(ROTA_PUBLICA, true);
