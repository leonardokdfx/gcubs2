import AvisoConsulta from "./models/avisoConsulta";
import Paciente from "./models/paciente";
import { HttpError } from "./http";
import { hojeNoFuso } from "@/utils/agendamento";
import { MAX_AVISOS_FUTUROS, validarAviso } from "@/utils/avisosConsulta";
import { mascaraCPF, primeiroNome, somenteDigitos } from "@/utils/formatos";

const meiaNoite = (iso) => new Date(`${iso}T00:00:00Z`);
const texto = (v, max) => String(v ?? "").trim().slice(0, max);

/**
 * Paciente da lista da equipe que bate com CPF + data de nascimento (as duas juntas identificam quem é).
 * Retorna null se não achar. Lança 400 se os dados vierem incompletos.
 */
export async function pacienteDoPortal(cpf, dataNascimento) {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11 || !/^\d{4}-\d{2}-\d{2}$/.test(String(dataNascimento || ""))) {
    throw new HttpError(400, "Informe o CPF e a data de nascimento.");
  }
  return Paciente.findOne({
    cpf: { $in: [digitos, mascaraCPF(digitos)] },
    dataNascimento: meiaNoite(dataNascimento),
  }).select("nome cpf telefone equipe microarea responsavel");
}

/** Só o que o paciente precisa ver dos próprios avisos. */
export const avisoPublico = (a) => ({
  _id: a._id,
  dataConsulta: a.dataConsulta,
  horario: a.horario,
  profissional: a.profissional,
  resposta: a.resposta,
  motivo: a.motivo,
  observacao: a.observacao,
  repasse: a.repasse,
  repassadoEm: a.repassadoEm,
  mudouDeIdeia: a.mudouDeIdeia,
  atualizadoEm: a.atualizadoEm,
});

export const pacientePublico = (p) => ({ nome: primeiroNome(p.nome), equipe: p.equipe, acs: p.responsavel || "" });

/** Avisos de hoje em diante do paciente, do mais próximo para o mais distante. */
export function avisosFuturos(pacienteId) {
  return AvisoConsulta.find({ paciente: pacienteId, dataConsulta: { $gte: meiaNoite(hojeNoFuso()) } }).sort({ dataConsulta: 1, horario: 1 });
}

/**
 * Grava a resposta do paciente (cria ou atualiza o aviso daquela consulta) e decide o que o ACS precisa fazer:
 * - "não vou" → pendente: o ACS repassa à equipe para liberar a vaga;
 * - "vou" → nada a fazer, a menos que a equipe já tenha sido avisada da falta: aí volta a pendente,
 *   para o ACS avisar que o paciente mudou de ideia.
 */
export async function responderAviso(paciente, body, origem) {
  const erros = validarAviso(body);
  if (Object.keys(erros).length > 0) throw new HttpError(400, Object.values(erros)[0]);

  const filtro = { paciente: paciente._id, dataConsulta: meiaNoite(body.dataConsulta), profissional: body.profissional };
  const anterior = await AvisoConsulta.findOne(filtro);

  if (!anterior) {
    const futuros = await AvisoConsulta.countDocuments({ paciente: paciente._id, dataConsulta: { $gte: meiaNoite(hojeNoFuso()) } });
    if (futuros >= MAX_AVISOS_FUTUROS) throw new HttpError(429, "Você já avisou sobre muitas consultas. Procure a UBS ou seu ACS.");
  }

  const naoVou = body.resposta === "nao_vou";
  const trocou = !!anterior && anterior.resposta !== body.resposta;
  let repasse = naoVou ? "pendente" : "nao_precisa";
  if (anterior && !trocou) repasse = anterior.repasse; // mesma resposta: só atualiza horário ou motivo
  if (trocou && !naoVou && anterior.repasse === "feito") repasse = "pendente"; // a equipe precisa saber que ele vai

  const $set = {
    nome: paciente.nome,
    cpf: paciente.cpf,
    telefone: paciente.telefone,
    equipe: paciente.equipe,
    microarea: paciente.microarea,
    acs: paciente.responsavel,
    resposta: body.resposta,
    observacao: naoVou ? texto(body.observacao, 200) : "",
    mudouDeIdeia: trocou || !!anterior?.mudouDeIdeia,
    repasse,
    origem,
    atualizadoEm: new Date(),
  };
  // Mongoose ignora campos undefined no $set: o que precisa sumir vai no $unset.
  const $unset = {};
  if (body.horario) $set.horario = body.horario;
  else $unset.horario = "";
  if (naoVou && body.motivo) $set.motivo = body.motivo;
  else $unset.motivo = "";
  if (repasse !== "feito") Object.assign($unset, { repassadoPor: "", repassadoEm: "" });

  const aviso = await AvisoConsulta.findOneAndUpdate(filtro, { $set, $unset, $setOnInsert: { criadoEm: new Date() } }, { upsert: true, new: true });
  return { aviso, trocou, novo: !anterior };
}
