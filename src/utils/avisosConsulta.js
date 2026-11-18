// Aviso de consulta: o paciente diz no portal se vai ou não à consulta já marcada na UBS.
// Quando não vai, o ACS vê o aviso e repassa à equipe, que libera a vaga para outro paciente.
// Compartilhado entre a API, o portal e a tela da equipe.
import { hojeNoFuso } from "./agendamento";

export const PROFISSIONAIS_CONSULTA = {
  medico: "Médico(a)",
  enfermeiro: "Enfermeiro(a)",
  dentista: "Dentista",
  outro: "Outro profissional ou exame",
};
export const CHAVES_PROFISSIONAIS_CONSULTA = Object.keys(PROFISSIONAIS_CONSULTA);

export const RESPOSTAS_CONSULTA = {
  vou: "Vou à consulta",
  nao_vou: "Não vou à consulta",
};
export const CHAVES_RESPOSTAS = Object.keys(RESPOSTAS_CONSULTA);

/** Motivos que ajudam a equipe a entender as faltas. Opcional para o paciente. */
export const MOTIVOS_FALTA = {
  imprevisto: "Imprevisto ou compromisso",
  trabalho: "Trabalho",
  melhorou: "Não preciso mais",
  outro_local: "Vou ser atendido em outro lugar",
  transporte: "Não tenho como ir",
  outro: "Outro motivo",
};
export const CHAVES_MOTIVOS_FALTA = Object.keys(MOTIVOS_FALTA);

/**
 * O que o ACS precisa fazer com o aviso.
 * pendente: repassar à equipe (paciente não vai, ou mudou de ideia depois do repasse).
 * feito: já repassado. nao_precisa: paciente confirmou que vai, nada a fazer.
 */
export const REPASSES = ["pendente", "feito", "nao_precisa"];

/** Até quantos dias à frente o paciente pode avisar. */
export const DIAS_MAX_AVISO = 90;
/** Quantos avisos futuros cada paciente pode ter ao mesmo tempo (barreira contra abuso). */
export const MAX_AVISOS_FUTUROS = 10;

export function somarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function limitesConsulta() {
  const hoje = hojeNoFuso();
  return { min: hoje, max: somarDias(hoje, DIAS_MAX_AVISO) };
}

/** Erros do formulário do paciente, por campo. Objeto vazio = tudo certo. */
export function validarAviso(form) {
  const erros = {};
  const iso = String(form.dataConsulta || "");
  const d = new Date(`${iso}T00:00:00Z`);
  const { min, max } = limitesConsulta();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    erros.dataConsulta = "Informe o dia da consulta.";
  } else if (iso < min) {
    erros.dataConsulta = "Esta consulta já passou.";
  } else if (iso > max) {
    erros.dataConsulta = `Avise sobre consultas dos próximos ${DIAS_MAX_AVISO} dias.`;
  } else if ([0, 6].includes(d.getUTCDay())) {
    erros.dataConsulta = "A UBS atende de segunda a sexta. Confira o dia da consulta.";
  }
  if (form.horario && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(form.horario))) erros.horario = "Horário inválido.";
  if (!CHAVES_PROFISSIONAIS_CONSULTA.includes(form.profissional)) erros.profissional = "Escolha com quem é a consulta.";
  if (!CHAVES_RESPOSTAS.includes(form.resposta)) erros.resposta = "Diga se você vai ou não à consulta.";
  if (form.motivo && !CHAVES_MOTIVOS_FALTA.includes(form.motivo)) erros.motivo = "Motivo inválido.";
  return erros;
}

/** "segunda-feira, 23 de novembro, às 08:30". */
export function quandoConsulta(aviso, exibirData) {
  return `${exibirData(aviso.dataConsulta)}${aviso.horario ? `, às ${aviso.horario}` : ""}`;
}
