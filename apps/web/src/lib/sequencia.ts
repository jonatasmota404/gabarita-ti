// Guarda a ordem da última listagem para o botão "Próxima questão".
const CHAVE = 'gabarita:sequencia';

export function salvarSequencia(ids: number[]) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(ids));
  } catch {
    // armazenamento indisponível: o botão volta para a lista
  }
}

export function proximaDaSequencia(atual: number): number | null {
  try {
    const ids = JSON.parse(sessionStorage.getItem(CHAVE) ?? '[]') as number[];
    const i = ids.indexOf(atual);
    return i >= 0 && i + 1 < ids.length ? ids[i + 1]! : null;
  } catch {
    return null;
  }
}
