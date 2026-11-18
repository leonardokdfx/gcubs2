import { autenticar, json, lerCorpo, rota } from "@/server/http";
import { atualizarSetor, podeEditar } from "@/server/setores";

// PUT /api/setores/:chave { acao: "hoje" | "faltas" | "configurar", ... }
// O próprio setor informa a situação do dia; o supervisor também configura horário e "como funciona".
export const PUT = rota(async (req, { chave }) => {
  const user = await autenticar(req, { permitirSetor: true });
  const setor = await atualizarSetor(chave, await lerCorpo(req), user);
  return json({ message: "Funcionamento atualizado", setor: { ...setor, podeEditar: podeEditar(user, chave) } });
});
