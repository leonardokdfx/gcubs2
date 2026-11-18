import AvisoConsulta from "@/server/models/avisoConsulta";
import { autenticar, equipesAceitas, json, rota } from "@/server/http";
import { hojeNoFuso } from "@/utils/agendamento";
import { somarDias } from "@/utils/avisosConsulta";

export const dynamic = "force-dynamic";

// GET /api/avisos-consulta — avisos dos pacientes sobre consultas marcadas, de 7 dias atrás em diante.
// Supervisor vê todas as equipes; o ACS vê os da equipe dele.
export const GET = rota(async (req) => {
  const user = await autenticar(req);
  const desde = new Date(`${somarDias(hojeNoFuso(), -7)}T00:00:00Z`);
  const filtro = { dataConsulta: { $gte: desde } };
  if (user.role !== "supervisor") filtro.equipe = { $in: equipesAceitas(user.equipe) };
  const lista = await AvisoConsulta.find(filtro).select("-origem").sort({ dataConsulta: 1, horario: 1 }).limit(500);
  return json(lista);
});
