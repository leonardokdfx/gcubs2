import bcrypt from "bcryptjs";
import User from "@/server/models/user";
import { json, lerCorpo, rota } from "@/server/http";
import { gerarToken, sanitizarUser } from "@/server/usuarios";

export const POST = rota(async (req) => {
  const { email, senha } = await lerCorpo(req);
  if (!email || !senha) return json({ message: "Informe email e senha" }, 400);

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return json({ message: "Usuário não encontrado" }, 400);

  const isMatch = await bcrypt.compare(senha, user.senha);
  if (!isMatch) return json({ message: "Senha incorreta" }, 400);

  return json({ message: "Login realizado com sucesso!", token: gerarToken(user), user: sanitizarUser(user) });
});
