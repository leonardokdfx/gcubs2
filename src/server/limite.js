import { HttpError } from "./http";

// Limite simples de tentativas por chave (ex.: IP) numa janela de tempo.
// Fica na memória do processo: é uma barreira contra tentativas em massa,
// não uma garantia absoluta (cada instância serverless tem a sua contagem).
const janelas = globalThis.__limites ?? (globalThis.__limites = new Map());

export function limitar(chave, max, janelaMs) {
  const agora = Date.now();
  const atual = janelas.get(chave);
  if (!atual || agora - atual.inicio > janelaMs) {
    janelas.set(chave, { inicio: agora, total: 1 });
  } else {
    atual.total += 1;
    if (atual.total > max) {
      throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
    }
  }
  if (janelas.size > 5000) {
    for (const [k, v] of janelas) if (agora - v.inicio > janelaMs) janelas.delete(k);
  }
}
