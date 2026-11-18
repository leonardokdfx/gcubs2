// Política de senha única para telas e API (risco R-05 da documentação).
// A mesma regra vale no primeiro cadastro, na criação de contas pelo supervisor,
// na troca de senha pelo supervisor e na troca pelo próprio usuário em "Meu perfil".
export const SENHA_MINIMA = 10;

export const REQUISITOS_SENHA = [
  { id: "tamanho", texto: `Pelo menos ${SENHA_MINIMA} caracteres`, testa: (s) => s.length >= SENHA_MINIMA },
  { id: "maiuscula", texto: "Uma letra maiúscula", testa: (s) => /[A-Z]/.test(s) },
  { id: "minuscula", texto: "Uma letra minúscula", testa: (s) => /[a-z]/.test(s) },
  { id: "especial", texto: "Um número ou caractere especial (ex.: 7 ! @ #)", testa: (s) => /[^a-zA-Z]/.test(s) },
];

/** Mensagem do primeiro requisito não atendido, ou "" se a senha serve. */
export function erroSenha(senha) {
  const s = typeof senha === "string" ? senha : "";
  if (s.length > 128) return "A senha deve ter no máximo 128 caracteres.";
  const falta = REQUISITOS_SENHA.find((r) => !r.testa(s));
  return falta ? `A senha precisa ter: ${falta.texto.toLowerCase()}.` : "";
}
