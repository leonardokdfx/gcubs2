import Paciente from "@/server/models/paciente";
import { autenticar, json, podeAcessarEquipe, rota } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = rota(async (req, { id }) => {
  const user = autenticar(req);
  const paciente = await Paciente.findById(id).catch(() => null);
  if (!paciente) return json({ message: "Paciente não encontrado" }, 404);
  if (!podeAcessarEquipe(user, paciente.equipe)) {
    return json({ message: "Você não tem acesso a este paciente" }, 403);
  }
  return json(paciente);
});
