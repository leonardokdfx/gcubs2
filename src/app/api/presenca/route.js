import { apenasSupervisor, autenticar, json, lerCorpo, rota } from "@/server/http";
import { nomesEquipes } from "@/server/equipes";
import { presencasEntre, registrarPresenca } from "@/server/presenca";
import { hojeNoFuso } from "@/utils/agendamento";
import { isoValido, somarDiasISO } from "@/utils/presenca";

export const dynamic = "force-dynamic";

// GET /api/presenca?data=yyyy-mm-dd
// Presença do dia e as ausências já lançadas para os 30 dias seguintes.
// Supervisor vê todas as equipes; o ACS vê a dele (para orientar os pacientes).
export const GET = rota(async (req) => {
  const user = await autenticar(req);
  const pedida = new URL(req.url).searchParams.get("data");
  const data = isoValido(pedida) ? pedida : hojeNoFuso();
  const equipes = user.role === "supervisor" ? await nomesEquipes() : [user.equipe];
  const [dia, proximas] = await Promise.all([
    presencasEntre(equipes, data, data),
    presencasEntre(equipes, somarDiasISO(data, 1), somarDiasISO(data, 30), { situacao: "ausente" }),
  ]);
  return json({ data, dia, proximas });
});

// PUT /api/presenca { equipe, profissional, data, situacao, motivo?, turno?, ate?, recado? } — só o supervisor.
export const PUT = rota(async (req) => {
  const user = await autenticar(req);
  apenasSupervisor(user);
  const dias = await registrarPresenca(await lerCorpo(req), user);
  return json({ message: dias > 1 ? `Ausência lançada em ${dias} dias úteis` : "Presença registrada", dias });
});
