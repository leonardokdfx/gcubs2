import { autenticar, json, rota } from "@/server/http";
import { listarSetores, podeEditar } from "@/server/setores";

export const dynamic = "force-dynamic";

// GET /api/setores — equipe da unidade (supervisor, ACS e contas de setor).
// Cada setor vem com `podeEditar` para a conta logada.
export const GET = rota(async (req) => {
  const user = await autenticar(req, { permitirSetor: true });
  const setores = await listarSetores();
  return json({ setores: setores.map((s) => ({ ...s, podeEditar: podeEditar(user, s.chave) })), agora: new Date() });
});
