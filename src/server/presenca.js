import Presenca from "./models/presenca";
import { HttpError, equipesAceitas } from "./http";
import { equipeExiste } from "./equipes";
import { hojeNoFuso } from "@/utils/agendamento";
import {
  CHAVES_MOTIVOS,
  CHAVES_PROFISSIONAIS,
  DIAS_AVISO_PORTAL,
  DIAS_MAX_AUSENCIA,
  TURNOS,
  diaDeAtendimento,
  diasUteisEntre,
  isoValido,
  somarDiasISO,
} from "@/utils/presenca";

const meiaNoite = (iso) => new Date(`${iso}T00:00:00Z`);
const texto = (v, max) => String(v ?? "").trim().slice(0, max);

/** Registros de presença das equipes entre duas datas (inclusive). */
export function presencasEntre(equipes, de, ate, extra = {}) {
  const lista = equipes.flatMap((e) => equipesAceitas(e));
  return Presenca.find({ equipe: { $in: lista }, data: { $gte: meiaNoite(de), $lte: meiaNoite(ate) }, ...extra }).sort({ data: 1, equipe: 1, profissional: 1 });
}

/**
 * Valida o que o supervisor enviou e grava um dia (presente) ou um intervalo de dias úteis (ausente).
 * Retorna quantos dias foram gravados.
 */
export async function registrarPresenca(body, user) {
  const { equipe, profissional, situacao } = body;
  if (!(await equipeExiste(equipe))) throw new HttpError(400, "Selecione a equipe");
  if (!CHAVES_PROFISSIONAIS.includes(profissional)) throw new HttpError(400, "Escolha o profissional");
  if (!["presente", "ausente"].includes(situacao)) throw new HttpError(400, "Escolha presente ou ausente");

  const de = String(body.data || "");
  if (!isoValido(de)) throw new HttpError(400, "Informe a data");
  if (de < hojeNoFuso()) throw new HttpError(400, "A data não pode estar no passado");

  let dados = { situacao, motivo: undefined, turno: "Dia todo", recado: "" };
  let dias = [de];

  if (situacao === "ausente") {
    if (!CHAVES_MOTIVOS.includes(body.motivo)) throw new HttpError(400, "Escolha o motivo da ausência");
    const turno = TURNOS.includes(body.turno) ? body.turno : "Dia todo";
    const ate = body.ate ? String(body.ate) : de;
    if (!isoValido(ate)) throw new HttpError(400, "Data final inválida");
    if (ate < de) throw new HttpError(400, "A data final precisa ser depois da inicial");
    if (ate > somarDiasISO(de, DIAS_MAX_AUSENCIA - 1)) throw new HttpError(400, `Lance no máximo ${DIAS_MAX_AUSENCIA} dias de cada vez`);
    dias = diasUteisEntre(de, ate);
    if (dias.length === 0) throw new HttpError(400, "O período escolhido não tem dia útil");
    dados = { situacao, motivo: body.motivo, turno, recado: texto(body.recado, 200) };
  }

  const agora = new Date();
  await Presenca.bulkWrite(
    dias.map((d) => ({
      updateOne: {
        filter: { equipe, profissional, data: meiaNoite(d) },
        update: { $set: { ...dados, registradoPor: user.nome, atualizadoEm: agora } },
        upsert: true,
      },
    }))
  );
  return dias.length;
}

// O portal mostra só "ausente", o turno e o recado. O motivo (férias, licença…) é dado
// funcional do servidor e fica restrito à área interna (R-16).
const publico = (r) => ({
  profissional: r.profissional,
  data: r.data,
  situacao: r.situacao,
  turno: r.turno,
  recado: r.recado,
});

/**
 * O que o paciente vê no acompanhamento: a presença no dia de atendimento
 * (hoje, ou a próxima segunda se for fim de semana) e as ausências já avisadas para os próximos dias.
 */
export async function atendimentoDaEquipe(equipe) {
  if (!equipe) return null;
  const dia = diaDeAtendimento();
  const registros = await presencasEntre([equipe], dia, somarDiasISO(dia, DIAS_AVISO_PORTAL));
  const doDia = registros.filter((r) => r.data.toISOString().slice(0, 10) === dia);
  return {
    equipe,
    dia,
    profissionais: CHAVES_PROFISSIONAIS.map((p) => {
      const r = doDia.find((x) => x.profissional === p);
      return r ? publico(r) : { profissional: p, situacao: "nao_informado" };
    }),
    proximasAusencias: registros.filter((r) => r.situacao === "ausente" && r.data.toISOString().slice(0, 10) > dia).map(publico),
  };
}
