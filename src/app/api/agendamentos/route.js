import Agendamento from "@/server/models/agendamento";
import { autenticar, equipesAceitas, json, rota } from "@/server/http";

export const dynamic = "force-dynamic";

// Pedidos de cadastro feitos pelos pacientes no portal.
// O CEP do paciente já define equipe, microárea e ACS. Supervisor vê todos.
// Agente vê os pedidos da equipe dele que são da sua microárea (ou que
// ainda não têm ACS definido, para alguém da equipe assumir).
export const GET = rota(async (req) => {
  const user = autenticar(req);
  const filtro =
    user.role === "supervisor"
      ? {}
      : {
          equipe: { $in: equipesAceitas(user.equipe) },
          $or: [{ agente: user.id }, { agente: null }],
        };
  const lista = await Agendamento.find(filtro).select("-origem").sort({ criadoEm: -1 }).limit(500);
  return json(lista);
});
