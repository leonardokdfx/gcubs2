import User from "@/server/models/user";
import { autenticar, equipesAceitas, json, normalizarEquipe, rota } from "@/server/http";

export const dynamic = "force-dynamic";

// Agentes cadastrados e vinculados à equipe.
export const GET = rota(async (req, { equipe }) => {
  const user = autenticar(req);
  if (user.role !== "supervisor" && normalizarEquipe(user.equipe) !== normalizarEquipe(equipe)) {
    return json({ message: "Você não tem acesso a esta equipe" }, 403);
  }
  const responsaveis = await User.find({ role: "agente", equipe: { $in: equipesAceitas(equipe) } })
    .select("_id nome email equipe")
    .sort({ nome: 1 });
  return json(responsaveis);
});
