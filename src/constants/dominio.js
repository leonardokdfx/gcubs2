import {
  Wind,
  Flame,
  Mountain,
  Droplets,
  Sun,
  Leaf,
  TreePine,
  Flower2,
  Star,
  Moon,
  Cloud,
  Waves,
  Heart,
  Bird,
  Shield,
  House,
  CircleCheck,
  UserX,
  DoorClosed,
  Clock,
} from "lucide-react";
import { EQUIPES_INICIAIS } from "../utils/equipes";

/** Desenho de cada ícone de equipe (as chaves estão em src/utils/equipes.js). */
export const ICONES_EQUIPE_COMPONENTES = {
  vento: Wind,
  fogo: Flame,
  montanha: Mountain,
  gota: Droplets,
  sol: Sun,
  folha: Leaf,
  arvore: TreePine,
  flor: Flower2,
  estrela: Star,
  lua: Moon,
  nuvem: Cloud,
  onda: Waves,
  coracao: Heart,
  passaro: Bird,
  escudo: Shield,
  casa: House,
};

const comIcone = (e) => ({ ...e, Icone: ICONES_EQUIPE_COMPONENTES[e.icone] || Wind });

// Equipes da unidade. Ficam no banco e o supervisor gerencia em Configurações › Equipes.
// Estas listas são preenchidas pelo EquipesProvider (src/auth/EquipesContext.jsx) assim que o app abre;
// até lá valem as equipes iniciais. São atualizadas no lugar para quem já importou continuar vendo a lista certa.
export const EQUIPES = EQUIPES_INICIAIS.map(comIcone);
export const NOMES_EQUIPES = EQUIPES.map((e) => e.nome);

/** Troca a lista de equipes (chamado pelo EquipesProvider). */
export function definirEquipes(lista) {
  const novas = (lista || []).map(comIcone);
  EQUIPES.splice(0, EQUIPES.length, ...novas);
  NOMES_EQUIPES.splice(0, NOMES_EQUIPES.length, ...novas.map((e) => e.nome));
}

export function getEquipe(nome) {
  return EQUIPES.find((e) => e.nome === nome) || { nome, Icone: Wind };
}

/** Equipes que o usuário logado pode acessar. */
export function equipesDoUsuario(user) {
  if (!user) return [];
  if (user.role === "supervisor") return EQUIPES;
  return EQUIPES.filter((e) => e.nome === user.equipe);
}

/**
 * Situações da visita. `valor` é exatamente o que o backend grava;
 * `chave` é usada no CSS (data-status) e nos filtros.
 * A ordem é a mesma da barra de andamento.
 */
export const SITUACOES = [
  {
    chave: "realizada",
    valor: "Visita realizada",
    rotulo: "Visita realizada",
    curto: "Realizadas",
    singular: "realizada",
    Icone: CircleCheck,
    rota: "Visita realizada",
    tituloRelatorio: "Visitas realizadas",
  },
  {
    chave: "ausente",
    valor: "Visita realizada - paciente ausente",
    rotulo: "Paciente ausente",
    curto: "Ausentes",
    singular: "paciente ausente",
    Icone: UserX,
    rota: "Visita realizada - paciente ausente",
    tituloRelatorio: "Visitas com paciente ausente",
  },
  {
    chave: "naomora",
    valor: "Não mora",
    rotulo: "Não mora",
    curto: "Não mora",
    singular: "não mora",
    Icone: DoorClosed,
    rota: "Não mora",
    tituloRelatorio: "Pacientes que não moram no endereço",
  },
  {
    chave: "pendente",
    valor: "",
    rotulo: "Pendente de visita",
    curto: "Pendentes",
    singular: "pendente",
    Icone: Clock,
    rota: "Pendencias",
    tituloRelatorio: "Pacientes pendentes de visita",
  },
];

export function situacaoDe(status) {
  const valor = (status || "").trim();
  return SITUACOES.find((s) => s.valor === valor) || SITUACOES[SITUACOES.length - 1];
}

export function situacaoPorChave(chave) {
  return SITUACOES.find((s) => s.chave === chave);
}

export function situacaoPorRota(rota) {
  return SITUACOES.find((s) => s.rota === rota);
}

/** Conta pacientes por situação: { realizada, ausente, naomora, pendente, total } */
export function contarSituacoes(pacientes) {
  const contagem = { realizada: 0, ausente: 0, naomora: 0, pendente: 0, total: pacientes.length };
  for (const p of pacientes) {
    contagem[situacaoDe(p.status).chave] += 1;
  }
  return contagem;
}

export const GRUPOS_ATENCAO = ["Diabéticos", "Hipertensos", "Gestantes"];

export function rotuloPapel(user) {
  if (!user) return "";
  if (user.role === "supervisor") return "Supervisor";
  if (user.role === "setor") return "Conta de setor";
  return user.equipe ? `ACS · Equipe ${user.equipe}` : "ACS";
}
