// Regras do agendamento compartilhadas entre o portal (navegador) e a API.
import { cnsValido, cpfValido, mascaraCEP, somenteDigitos } from "./formatos";

export const PERIODOS = ["Manhã", "Tarde"];
export const DIAS_ANTECEDENCIA_MAX = 60;

/** Situações do pedido, com o visual da tag (reaproveita as cores de situação da visita). */
export const SITUACOES_AGENDAMENTO = {
  Aguardando: { rotulo: "Aguardando confirmação", curto: "Novos", tag: "pendente" },
  Confirmado: { rotulo: "Visita confirmada", curto: "Confirmados", tag: "primary" },
  Cadastrado: { rotulo: "Cadastro concluído", curto: "Concluídos", tag: "realizada" },
  Cancelado: { rotulo: "Cancelado", curto: "Cancelados", tag: "naomora" },
};

const FUSO = "America/Sao_Paulo";

/** Data de hoje (yyyy-mm-dd) no fuso da unidade, igual no navegador e no servidor. */
export function hojeNoFuso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

function somarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Primeira e última data aceitas: de amanhã até 60 dias. */
export function limitesData() {
  const hoje = hojeNoFuso();
  return { min: somarDias(hoje, 1), max: somarDias(hoje, DIAS_ANTECEDENCIA_MAX) };
}

/** Retorna a mensagem de erro da data escolhida, ou null se estiver ok. */
export function erroData(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Escolha uma data.";
  const data = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) return "Data inválida.";
  const { min, max } = limitesData();
  if (iso < min) return "Escolha uma data a partir de amanhã.";
  if (iso > max) return `Escolha uma data nos próximos ${DIAS_ANTECEDENCIA_MAX} dias.`;
  const dia = data.getUTCDay();
  if (dia === 0 || dia === 6) return "Os agentes visitam de segunda a sexta. Escolha um dia útil.";
  return null;
}

/** Datas são gravadas à meia-noite UTC; exibimos sempre em UTC para não "voltar um dia". */
export function exibirData(valor, opcoes = { weekday: "long", day: "numeric", month: "long" }) {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { ...opcoes, timeZone: "UTC" });
}

export function paraISO(valor) {
  return valor ? String(new Date(valor).toISOString()).slice(0, 10) : "";
}

/** Data de nascimento: válida, no passado e com no máximo 130 anos. */
export function erroNascimento(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Informe a data de nascimento.";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return "Data de nascimento inválida.";
  const hoje = hojeNoFuso();
  if (iso > hoje) return "A data de nascimento não pode estar no futuro.";
  if (Number(hoje.slice(0, 4)) - d.getUTCFullYear() > 130) return "Confira o ano de nascimento.";
  return null;
}

/** Validação do pedido de cadastro feito no portal (sem senha). */
export function validarPedido(form) {
  const e = {};
  if (!String(form.nome || "").trim()) e.nome = "Informe o nome completo.";
  if (!String(form.cpf || "").trim()) e.cpf = "Informe o CPF.";
  else if (!cpfValido(form.cpf)) e.cpf = "CPF inválido. Confira os 11 dígitos.";
  const msgNasc = erroNascimento(form.dataNascimento);
  if (msgNasc) e.dataNascimento = msgNasc;
  if (form.cns && !cnsValido(form.cns)) e.cns = "Cartão SUS inválido. Confira os 15 números.";
  if (!String(form.telefone || "").trim()) e.telefone = "Informe um telefone para contato.";
  else if (somenteDigitos(form.telefone).length < 10) e.telefone = "Telefone incompleto. Inclua o DDD.";
  if (somenteDigitos(form.cep).length !== 8) e.cep = "Informe o CEP completo.";
  if (!String(form.endereco || "").trim()) e.endereco = "Informe o endereço.";
  if (!String(form.numero || "").trim()) e.numero = "Informe o número ou apartamento (use S/N se não houver).";
  if (!["Sim", "Não"].includes(form.trabalhador)) e.trabalhador = "Informe se você trabalha fora.";
  if (!String(form.melhorHorario || "").trim()) e.melhorHorario = "Informe o melhor horário para receber o agente.";
  const msgData = erroData(form.dataPreferida);
  if (msgData) e.dataPreferida = msgData;
  if (!PERIODOS.includes(form.periodoPreferido)) e.periodoPreferido = "Escolha manhã ou tarde.";
  if (form.consentimento !== true) e.consentimento = "É preciso concordar com o uso dos dados para enviar o pedido.";
  return e;
}

/**
 * Lê uma lista de CEPs colada pelo supervisor (uma linha por endereço).
 * Aceita "70766-010 SQN 404 Bloco A", "70766010;SQN 404 Bloco A" ou
 * duas colunas copiadas do Excel (separadas por tab), em qualquer ordem.
 * Retorna { ceps: [{cep, endereco}], invalidas: [linhas], repetidos: [cep] }.
 */
export function lerListaCeps(texto) {
  const ceps = [];
  const invalidas = [];
  const repetidos = [];
  const vistos = new Set();
  for (const bruta of String(texto || "").split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const m = linha.match(/(\d{2}\.?\d{3})-?(\d{3})/);
    if (!m) {
      invalidas.push(linha);
      continue;
    }
    const cep = somenteDigitos(m[1] + m[2]);
    const endereco = (linha.slice(0, m.index) + " " + linha.slice(m.index + m[0].length))
      .replace(/[\t;,|]+/g, " ")
      .replace(/^\s*[-–—:]\s*|\s*[-–—:]\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    if (vistos.has(cep)) {
      repetidos.push(mascaraCEP(cep));
      continue;
    }
    vistos.add(cep);
    ceps.push({ cep, endereco });
  }
  return { ceps, invalidas, repetidos };
}

/** Converte a lista de CEPs de volta para o texto editável (uma linha por CEP). */
export function escreverListaCeps(ceps) {
  return (ceps || []).map((c) => `${mascaraCEP(c.cep)}${c.endereco ? ` ${c.endereco}` : ""}`).join("\n");
}
