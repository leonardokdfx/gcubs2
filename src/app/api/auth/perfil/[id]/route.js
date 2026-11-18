import bcrypt from "bcryptjs";
import User from "@/server/models/user";
import { autenticar, json, lerCorpo, rota } from "@/server/http";
import { sanitizarUser } from "@/server/usuarios";
import { erroSenha } from "@/utils/senha";

// Atualiza o perfil (apenas o próprio usuário).
export const PUT = rota(async (req, { id }) => {
  const sessao = await autenticar(req, { permitirSetor: true });
  if (sessao.id !== id) return json({ message: "Você só pode editar o próprio perfil" }, 403);

  const { nome, email, senhaAtual, novaSenha, foto } = await lerCorpo(req);
  const user = await User.findById(id);
  if (!user) return json({ message: "Usuário não encontrado" }, 404);

  if (novaSenha) {
    if (erroSenha(novaSenha)) return json({ message: erroSenha(novaSenha) }, 400);
    const senhaCorreta = await bcrypt.compare(String(senhaAtual || ""), user.senha);
    if (!senhaCorreta) return json({ message: "Senha atual incorreta" }, 400);
    user.senha = await bcrypt.hash(novaSenha, await bcrypt.genSalt(10));
  }

  if (typeof email === "string" && email.trim()) {
    const emailNovo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNovo)) return json({ message: "Informe um e-mail válido" }, 400);
    if (await User.exists({ email: emailNovo, _id: { $ne: user._id } })) return json({ message: "Email já cadastrado" }, 400);
    user.email = emailNovo;
  }
  if (typeof nome === "string" && nome.trim()) user.nome = nome.trim().slice(0, 120);
  // Foto só por endereço https, para não carregar conteúdo de origem insegura (R-19).
  if (typeof foto === "string" && foto.trim()) {
    if (!/^https:\/\/[^\s"'<>]+$/i.test(foto.trim()) || foto.length > 500) {
      return json({ message: "Use um endereço de imagem que comece com https://" }, 400);
    }
    user.foto = foto.trim();
  }
  await user.save();

  return json({ message: "Perfil atualizado com sucesso!", user: sanitizarUser(user) });
});
