import crypto from "node:crypto";
import Agendamento from "./models/agendamento";
import { mascaraCEP, mascaraCNS, mascaraCPF, mascaraTelefone, somenteDigitos } from "@/utils/formatos";
import { GRUPOS } from "./constantes";

const texto = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const contagem = (v) => Math.max(0, Math.min(99, Math.floor(Number(v) || 0)));

/**
 * Copia do corpo da requisição apenas os campos que o paciente pode preencher.
 * Situação, equipe, microárea, responsável etc. são sempre definidos pelo sistema.
 */
export function camposDoPedido(body) {
  const trabalhador = body.trabalhador === "Sim" ? "Sim" : body.trabalhador === "Não" ? "Não" : undefined;
  return {
    nome: texto(body.nome, 120),
    telefone: mascaraTelefone(body.telefone),
    cns: somenteDigitos(body.cns).length === 15 ? mascaraCNS(body.cns) : "",
    cep: mascaraCEP(body.cep),
    endereco: texto(body.endereco, 200),
    numero: texto(body.numero, 40),
    pontoReferencia: texto(body.pontoReferencia, 200),
    trabalhador,
    enderecoMoradia: trabalhador === "Sim" ? texto(body.enderecoMoradia, 200) : "",
    melhorHorario: texto(body.melhorHorario, 120),
    moradoresHomens: contagem(body.moradoresHomens),
    moradoresMulheres: contagem(body.moradoresMulheres),
    moradoresCriancas: contagem(body.moradoresCriancas),
    gruposAtencao: Array.isArray(body.gruposAtencao) ? [...new Set(body.gruposAtencao.filter((g) => GRUPOS.includes(g)))] : [],
    numeroSES: texto(body.numeroSES, 40),
    observacao: texto(body.observacao, 1000),
    periodoPreferido: body.periodoPreferido,
  };
}

/** IP de quem fez a requisição (atrás de proxy/Vercel vem em x-forwarded-for). */
export function ipDe(req) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Guarda só um hash do IP (LGPD): serve para limitar abusos sem identificar ninguém. */
export function origemDe(req) {
  return crypto
    .createHash("sha256")
    .update(`${ipDe(req)}|${process.env.JWT_SECRET || ""}`)
    .digest("hex")
    .slice(0, 32);
}

// Sem 0/O, 1/I/L, para o paciente conseguir ditar por telefone.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function gerarProtocolo() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

// Só o necessário para o paciente acompanhar o pedido (sem endereço nem dados de saúde).
export const CAMPOS_CONSULTA =
  "protocolo situacao dataPreferida periodoPreferido dataAgendada periodoAgendado equipe microarea responsavel motivoCancelamento canceladoPor criadoEm";

/** Busca os pedidos que batem com CPF + data de nascimento (as duas coisas juntas identificam o paciente). */
export async function pedidosDoPaciente(cpf, dataNascimento, extra = {}) {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11 || !/^\d{4}-\d{2}-\d{2}$/.test(String(dataNascimento || ""))) return null;
  return Agendamento.find({
    cpf: mascaraCPF(digitos),
    dataNascimento: new Date(`${dataNascimento}T00:00:00Z`),
    ...extra,
  })
    .select(CAMPOS_CONSULTA)
    .sort({ criadoEm: -1 })
    .limit(20);
}

