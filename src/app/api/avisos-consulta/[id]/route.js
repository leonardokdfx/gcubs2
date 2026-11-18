import AvisoConsulta from "@/server/models/avisoConsulta";
import { autenticar, json, lerCorpo, podeAcessarEquipe, rota } from "@/server/http";

// PUT /api/avisos-consulta/:id { acao: "repassar" | "desfazer" }
// O ACS marca que já passou o aviso para a equipe (ou desfaz, se marcou por engano).
export const PUT = rota(async (req, { id }) => {
  const user = await autenticar(req);
  if (!/^[a-f0-9]{24}$/i.test(String(id || ""))) return json({ message: "Aviso não encontrado" }, 404);
  const aviso = await AvisoConsulta.findById(id);
  if (!aviso || !podeAcessarEquipe(user, aviso.equipe)) return json({ message: "Aviso não encontrado" }, 404);

  const { acao } = await lerCorpo(req);
  if (acao === "repassar") {
    if (aviso.repasse !== "pendente") return json({ message: "Este aviso não precisa ser repassado" }, 400);
    Object.assign(aviso, { repasse: "feito", repassadoPor: user.nome, repassadoEm: new Date() });
    await aviso.save();
    return json({ message: "Repasse registrado", aviso });
  }
  if (acao === "desfazer") {
    if (aviso.repasse !== "feito") return json({ message: "Este aviso ainda não foi repassado" }, 400);
    Object.assign(aviso, { repasse: "pendente", repassadoPor: undefined, repassadoEm: undefined });
    await aviso.save();
    return json({ message: "Repasse desfeito", aviso });
  }
  return json({ message: "Ação inválida" }, 400);
});
