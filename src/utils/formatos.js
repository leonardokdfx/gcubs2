export const somenteDigitos = (valor) => String(valor || "").replace(/\D/g, "");

export function mascaraCPF(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function mascaraTelefone(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCEP(valor) {
  const d = somenteDigitos(valor).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Valida os dígitos verificadores do CPF. */
export function cpfValido(valor) {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i += 1) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Formata para exibição sem alterar o valor salvo (dados antigos podem estar sem máscara). */
export function exibirCPF(valor) {
  const d = somenteDigitos(valor);
  return d.length === 11 ? mascaraCPF(d) : valor || "—";
}

export function exibirTelefone(valor) {
  const d = somenteDigitos(valor);
  return d.length >= 10 ? mascaraTelefone(d) : valor || "—";
}

export function hrefTelefone(valor) {
  const d = somenteDigitos(valor);
  return d.length >= 10 ? `tel:+55${d}` : null;
}

export function enderecoCompleto(p) {
  return [p.endereco, p.numero].filter(Boolean).join(", ");
}

export function iniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}

export function hojeISO() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function percentual(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

export function plural(n, singular, pluralForma) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : pluralForma}`;
}

/** Normaliza texto para busca: sem acento, minúsculo. */
export function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
