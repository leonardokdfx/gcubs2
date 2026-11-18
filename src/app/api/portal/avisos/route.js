import { json, lerCorpo, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { ipDe } from "@/server/portal";
import { avisoPublico, avisosFuturos, pacienteDoPortal, pacientePublico } from "@/server/avisosConsulta";

// POST /api/portal/avisos { cpf, dataNascimento } — público.
// Identifica o paciente na lista da equipe e devolve os avisos de consulta de hoje em diante.
export const POST = rota(async (req) => {
  limitar(`consulta:${ipDe(req)}`, 15, 15 * 60 * 1000);
  const { cpf, dataNascimento } = await lerCorpo(req);
  const paciente = await pacienteDoPortal(cpf, dataNascimento);
  if (!paciente) {
    return json(
      { message: "Não encontramos seu cadastro na equipe com este CPF e esta data de nascimento. Procure a UBS ou o agente comunitário de saúde da sua área.", semCadastro: true },
      404
    );
  }
  const avisos = await avisosFuturos(paciente._id);
  return json({ paciente: pacientePublico(paciente), avisos: avisos.map(avisoPublico) });
});
