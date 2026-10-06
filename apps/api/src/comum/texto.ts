const TAMANHO_TRECHO = 220;

/** Início do enunciado em uma linha, para listagens. */
export function trecho(enunciado: string | null) {
  const texto = (enunciado ?? '')
    .replace(
      /\[(FIGURA|TABELA)\s+(\d+)\]/gi,
      (_, tipo: string, n: string) => `(${tipo.toLowerCase()} ${n})`,
    )
    .replace(/\s+/g, ' ')
    .trim();
  return texto.length > TAMANHO_TRECHO ? `${texto.slice(0, TAMANHO_TRECHO - 1)}…` : texto;
}
