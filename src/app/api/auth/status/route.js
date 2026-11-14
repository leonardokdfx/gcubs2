import User from "@/server/models/user";
import { json, rota } from "@/server/http";

export const dynamic = "force-dynamic";

// Diz ao frontend se ainda não existe nenhum usuário (libera o /cadastro inicial).
export const GET = rota(async () => {
  const totalUsuarios = await User.countDocuments();
  return json({ precisaBootstrap: totalUsuarios === 0 });
});
