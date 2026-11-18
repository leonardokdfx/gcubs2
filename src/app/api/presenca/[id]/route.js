import Presenca from "@/server/models/presenca";
import { apenasSupervisor, autenticar, json, rota } from "@/server/http";

// DELETE /api/presenca/:id — apaga um lançamento (o dia volta a "não informado"). Só o supervisor.
export const DELETE = rota(async (req, { id }) => {
  const user = await autenticar(req);
  apenasSupervisor(user);
  const apagado = await Presenca.findByIdAndDelete(id).catch(() => null);
  if (!apagado) return json({ message: "Lançamento não encontrado" }, 404);
  return json({ message: "Lançamento apagado" });
});
