import User from "@/server/models/user";
import { autenticar, json, rota } from "@/server/http";
import { sanitizarUser } from "@/server/usuarios";

export const dynamic = "force-dynamic";

export const GET = rota(async (req) => {
  const sessao = autenticar(req);
  const user = await User.findById(sessao.id);
  if (!user) return json({ message: "Usuário não encontrado" }, 404);
  return json({ user: sanitizarUser(user) });
});
