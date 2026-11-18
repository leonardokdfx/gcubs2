// Ícones que o supervisor pode escolher para uma equipe (a chave é o que fica gravado no banco).
// Os componentes de cada ícone ficam em src/constants/dominio.js.
export const ICONES_EQUIPE = {
  vento: "Vento",
  fogo: "Fogo",
  montanha: "Montanha",
  gota: "Gota",
  sol: "Sol",
  folha: "Folha",
  arvore: "Árvore",
  flor: "Flor",
  estrela: "Estrela",
  lua: "Lua",
  nuvem: "Nuvem",
  onda: "Onda",
  coracao: "Coração",
  passaro: "Pássaro",
  escudo: "Escudo",
  casa: "Casa",
};
export const CHAVES_ICONES_EQUIPE = Object.keys(ICONES_EQUIPE);

/** Equipes criadas automaticamente na primeira vez (as que o sistema já tinha). */
export const EQUIPES_INICIAIS = [
  { nome: "Ar", icone: "vento" },
  { nome: "Fogo", icone: "fogo" },
  { nome: "Terra", icone: "montanha" },
  { nome: "Água", icone: "gota" },
  { nome: "Sol", icone: "sol" },
];

/** Compara nomes sem acento e sem diferença de maiúsculas ("Água" = "agua"). */
export const chaveEquipe = (nome) =>
  String(nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
