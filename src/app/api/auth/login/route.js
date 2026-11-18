import bcrypt from "bcryptjs";
import User from "@/server/models/user";
import { json, lerCorpo, rota } from "@/server/http";
import { limitar, limparFalhas, registrarFalha, verificarFalhas } from "@/server/limite";
import { ipDe } from "@/server/portal";
import { gerarToken, sanitizarUser } from "@/server/usuarios";

// Mesma mensagem para e-mail inexistente e senha errada: não revela quais contas existem (R-04).
const CREDENCIAIS_INVALIDAS = "E-mail ou senha incorretos";
const JANELA = 15 * 60 * 1000;
// Hash de uma senha qualquer, comparado quando o e-mail não existe, para que a resposta
// leve o mesmo tempo nos dois casos (não dá para descobrir contas pelo tempo de resposta).
const HASH_FICTICIO = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.MdTZ6nGkOAbmS0VfO2lG5UQbi0f6";

export const POST = rota(async (req) => {
  const { email, senha } = await lerCorpo(req);
  if (!email || !senha) return json({ message: "Informe email e senha" }, 400);

  const emailNormalizado = String(email).trim().toLowerCase();
  // Barreira contra tentativas em massa (R-04): até 20 tentativas por IP e
  // 5 senhas erradas por conta a cada 15 minutos.
  limitar(`login-ip:${ipDe(req)}`, 20, JANELA);
  const chaveConta = `login-conta:${emailNormalizado}`;
  verificarFalhas(chaveConta, 5, JANELA);

  const user = await User.findOne({ email: emailNormalizado });
  const isMatch = await bcrypt.compare(String(senha), user ? user.senha : HASH_FICTICIO);
  if (!user || !isMatch) {
    registrarFalha(chaveConta, JANELA);
    return json({ message: CREDENCIAIS_INVALIDAS }, 401);
  }
  limparFalhas(chaveConta);

  return json({ message: "Login realizado com sucesso!", token: gerarToken(user), user: sanitizarUser(user) });
});
