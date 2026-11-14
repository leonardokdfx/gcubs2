import bcrypt from "bcryptjs";
import User from "@/server/models/user";
import { json, lerCorpo, lerToken, rota } from "@/server/http";

// Só supervisor cadastra usuários. Exceção: se não houver nenhum usuário,
// o primeiro cadastro vira supervisor (bootstrap do sistema).
export const POST = rota(async (req) => {
  const { nome, email, senha, role, equipe } = await lerCorpo(req);

  if (!nome || !email || !senha) {
    return json({ message: "Preencha nome, email e senha" }, 400);
  }

  const totalUsuarios = await User.countDocuments();

  if (totalUsuarios > 0) {
    const payload = lerToken(req);
    if (!payload || payload.role !== "supervisor") {
      return json({ message: "Apenas o supervisor pode cadastrar novos usuários" }, 403);
    }
  }

  const userExist = await User.findOne({ email: String(email).toLowerCase() });
  if (userExist) return json({ message: "Email já cadastrado" }, 400);

  const roleFinal = totalUsuarios === 0 ? "supervisor" : role || "agente";
  if (roleFinal === "agente" && !equipe) {
    return json({ message: "Selecione a equipe do agente" }, 400);
  }

  const hashedPassword = await bcrypt.hash(senha, await bcrypt.genSalt(10));
  await new User({
    nome,
    email,
    senha: hashedPassword,
    role: roleFinal,
    equipe: roleFinal === "agente" ? equipe : undefined,
  }).save();

  return json(
    {
      message:
        totalUsuarios === 0
          ? "Primeiro usuário (supervisor) cadastrado com sucesso!"
          : "Usuário cadastrado com sucesso!",
    },
    201
  );
});
