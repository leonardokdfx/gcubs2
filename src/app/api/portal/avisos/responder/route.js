import { json, lerCorpo, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { ipDe, origemDe } from "@/server/portal";
import { avisoPublico, avisosFuturos, pacienteDoPortal, responderAviso } from "@/server/avisosConsulta";

// POST /api/portal/avisos/responder { cpf, dataNascimento, dataConsulta, horario?, profissional, resposta, motivo?, observacao? } — público.
// O paciente diz se vai ou não à consulta marcada. "Não vou" aparece para o ACS repassar à equipe.
export const POST = rota(async (req) => {
  limitar(`aviso:${ipDe(req)}`, 20, 15 * 60 * 1000);
  const body = await lerCorpo(req);
  const paciente = await pacienteDoPortal(body.cpf, body.dataNascimento);
  if (!paciente) return json({ message: "Não encontramos seu cadastro na equipe. Procure a UBS ou seu ACS." }, 404);

  const { aviso, trocou } = await responderAviso(paciente, body, origemDe(req));
  const avisos = await avisosFuturos(paciente._id);
  let message = "Obrigado! A equipe conta com você na consulta.";
  if (aviso.resposta === "nao_vou") message = "Aviso enviado. Seu ACS vai passar para a equipe, e a vaga fica para outro paciente.";
  else if (trocou && aviso.repasse === "pendente") message = "Resposta trocada. Seu ACS vai avisar a equipe que você vai à consulta.";
  return json({ message, aviso: avisoPublico(aviso), avisos: avisos.map(avisoPublico) });
});
