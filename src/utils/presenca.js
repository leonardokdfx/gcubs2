// Presença dos profissionais da equipe (médico e enfermeiro), compartilhada entre a API,
// o painel da equipe e o acompanhamento no portal do paciente.
import { hojeNoFuso } from "./agendamento";

export const PROFISSIONAIS = {
  medico: { rotulo: "Médico(a)" },
  enfermeiro: { rotulo: "Enfermeiro(a)" },
};
export const CHAVES_PROFISSIONAIS = Object.keys(PROFISSIONAIS);

export const SITUACOES_PRESENCA = ["presente", "ausente"];

/** Motivos que o paciente pode ver. Nada de detalhe de saúde do profissional. */
export const MOTIVOS_AUSENCIA = {
  ferias: "Férias",
  licenca: "Licença",
  capacitacao: "Capacitação ou curso",
  externa: "Reunião ou atividade externa",
  outro: "Outro motivo",
};
export const CHAVES_MOTIVOS = Object.keys(MOTIVOS_AUSENCIA);

export const TURNOS = ["Dia todo", "Manhã", "Tarde"];

/** Uma ausência longa (férias) pode ser lançada de uma vez, até este número de dias corridos. */
export const DIAS_MAX_AUSENCIA = 31;

/** Quantos dias à frente o portal mostra os avisos de ausência. */
export const DIAS_AVISO_PORTAL = 14;

export function somarDiasISO(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diaUtil(iso) {
  const dia = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return dia !== 0 && dia !== 6;
}

/** Hoje, se for dia útil; senão, a próxima segunda-feira. */
export function diaDeAtendimento(iso = hojeNoFuso()) {
  let d = iso;
  while (!diaUtil(d)) d = somarDiasISO(d, 1);
  return d;
}

export function isoValido(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** Dias úteis entre duas datas (inclusive). */
export function diasUteisEntre(de, ate) {
  const dias = [];
  for (let d = de; d <= ate; d = somarDiasISO(d, 1)) if (diaUtil(d)) dias.push(d);
  return dias;
}

const isoDe = (data) => (typeof data === "string" ? data.slice(0, 10) : new Date(data).toISOString().slice(0, 10));

/**
 * Junta dias seguidos da mesma ausência (ex.: férias de segunda a sexta) num só período:
 * [{ profissional, de, ate, motivo, turno, recado, equipe, ids }].
 */
export function agruparAusencias(registros) {
  const ordenados = [...(registros || [])]
    .filter((r) => r.situacao === "ausente")
    .sort((a, b) => `${a.equipe}${a.profissional}${isoDe(a.data)}`.localeCompare(`${b.equipe}${b.profissional}${isoDe(b.data)}`));
  const grupos = [];
  for (const r of ordenados) {
    const dia = isoDe(r.data);
    const ultimo = grupos[grupos.length - 1];
    const mesmo =
      ultimo &&
      ultimo.equipe === r.equipe &&
      ultimo.profissional === r.profissional &&
      ultimo.motivo === r.motivo &&
      ultimo.turno === r.turno &&
      (ultimo.recado || "") === (r.recado || "") &&
      diaDeAtendimento(somarDiasISO(ultimo.ate, 1)) === dia;
    if (mesmo) {
      ultimo.ate = dia;
      if (r._id) ultimo.ids.push(r._id);
    } else {
      grupos.push({ equipe: r.equipe, profissional: r.profissional, motivo: r.motivo, turno: r.turno, recado: r.recado, de: dia, ate: dia, ids: r._id ? [r._id] : [] });
    }
  }
  return grupos.sort((a, b) => a.de.localeCompare(b.de));
}

/** "Férias · tarde" — o que o paciente lê ao lado de "Ausente". */
export function resumoAusencia(registro) {
  if (!registro || registro.situacao !== "ausente") return "";
  const motivo = MOTIVOS_AUSENCIA[registro.motivo] || "";
  const turno = registro.turno && registro.turno !== "Dia todo" ? `só pela ${registro.turno.toLowerCase()}` : "";
  return [motivo, turno].filter(Boolean).join(" · ");
}
