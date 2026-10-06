// Textos de exibição. Valores novos/desconhecidos do ingest caem num rótulo genérico.

const BANCAS: Record<string, string> = {
  cebraspe: 'Cebraspe',
  cesgranrio: 'Cesgranrio',
  fgv: 'FGV',
  fcc: 'FCC',
  vunesp: 'Vunesp',
};

export const rotuloBanca = (banca: string) =>
  BANCAS[banca] ?? banca.charAt(0).toUpperCase() + banca.slice(1);

export const rotuloTipoItem = (tipo: string) =>
  tipo === 'certo_errado'
    ? 'Certo ou Errado'
    : tipo === 'multipla_escolha'
      ? 'Múltipla escolha'
      : tipo;

export interface InfoStatus {
  rotulo: string;
  descricao: string;
  tom: 'neutro' | 'aviso' | 'perigo';
}

/** Explica o gabarito_status para o usuário. Só `ok` pontua. */
export function infoStatus(status: string): InfoStatus | null {
  switch (status) {
    case 'ok':
      return null;
    case 'anulada':
      return {
        rotulo: 'Anulada',
        descricao:
          'A banca anulou esta questão. Você pode responder, mas não conta como acerto nem erro.',
        tom: 'aviso',
      };
    case 'sem_gabarito':
      return {
        rotulo: 'Sem gabarito',
        descricao:
          'Ainda não temos o gabarito desta questão. Sua resposta fica registrada, sem pontuar.',
        tom: 'neutro',
      };
    case 'inconsistente':
      return {
        rotulo: 'Gabarito em revisão',
        descricao:
          'O gabarito desta questão tem um problema de extração. Ela não é pontuada até ser corrigida.',
        tom: 'perigo',
      };
    default:
      return {
        rotulo: 'Não pontuável',
        descricao:
          'Esta questão não tem gabarito utilizável no momento e não conta na sua estatística.',
        tom: 'neutro',
      };
  }
}

export const rotuloLetra = (tipoItem: string, letra: string) =>
  tipoItem === 'certo_errado'
    ? letra === 'C'
      ? 'Certo'
      : letra === 'E'
        ? 'Errado'
        : letra
    : letra;

export const formatarTaxa = (taxa: number | null) =>
  taxa === null ? '—' : `${Math.round(taxa * 100)}%`;
