import bcrypt from "bcryptjs";
import User from "@/server/models/user";
import { autenticar, json, lerCorpo, rota } from "@/server/http";
import { sanitizarUser } from "@/server/usuarios";

// Atualiza o perfil (apenas o próprio usuário).
export const PUT = rota(async (req, { id }) => {
  const sessao = autenticar(req);
  if (sessao.id !== id) return json({ message: "Você só pode editar o próprio perfil" }, 403);

  const { nome, email, senhaAtual, novaSenha, foto } = await lerCorpo(req);
  const user = await User.findById(id);
  if (!user) return json({ message: "Usuário não encontrado" }, 404);

  if (novaSenha) {
    const senhaCorreta = await bcrypt.compare(senhaAtual || "", user.senha);
    if (!senhaCorreta) return json({ message: "Senha atual incorreta" }, 400);
    user.senha = await bcrypt.hash(novaSenha, await bcrypt.genSalt(10));
  }

  if (nome) user.nome = nome;
  if (email) user.email = email;
  if (foto) user.foto = foto;
  await user.save();

  return json({ message: "Perfil atualizado com sucesso!", user: sanitizarUser(user) });
});
