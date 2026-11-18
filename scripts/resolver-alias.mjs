// Permite que os scripts em Node puro importem os modelos do sistema, que usam o
// atalho "@/" (= src/) e imports sem extensão, como o Next.js aceita.
export async function resolve(especificador, contexto, proximo) {
  let alvo = especificador;
  if (alvo.startsWith("@/")) alvo = new URL(`../src/${alvo.slice(2)}`, import.meta.url).href;
  try {
    return await proximo(alvo, contexto);
  } catch (err) {
    const relativo = alvo.startsWith(".") || alvo.startsWith("file:");
    if (relativo && !/\.[cm]?js$/.test(alvo)) return proximo(`${alvo}.js`, contexto);
    throw err;
  }
}
