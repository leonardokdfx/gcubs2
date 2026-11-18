import bcrypt from "bcryptjs";
import User from "@/server/models/user";
import { json, lerCorpo, lerToken, rota } from "@/server/http";
import { CHAVES_SETORES } from "@/utils/setores";
import { equipeExiste } from "@/server/equipes";
import { erroSenha } from "@/utils/senha";

// Só supervisor cadastra usuários. Exceção: se não houver nenhum usuário,
// o primeiro cadastro vira supervisor (bootstrap do sistema).
export const POST = rota(async (req) => {
  const { nome, email, senha, role, equipe, setores } = await lerCorpo(req);

  if (!nome || !email || !senha) {
    return json({ message: "Preencha nome, email e senha" }, 400);
  }
  if (erroSenha(senha)) return json({ message: erroSenha(senha) }, 400);

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
  if (!["agente", "supervisor", "setor"].includes(roleFinal)) {
    return json({ message: "Papel de usuário inválido" }, 400);
  }
  if (roleFinal === "agente" && !(await equipeExiste(equipe))) {
    return json({ message: "Selecione a equipe do agente" }, 400);
  }
  const setoresFinal = roleFinal === "setor" ? [...new Set((Array.isArray(setores) ? setores : []).filter((s) => CHAVES_SETORES.includes(s)))] : undefined;
  if (roleFinal === "setor" && setoresFinal.length === 0) {
    return json({ message: "Escolha os setores que esta conta atualiza" }, 400);
  }

  const hashedPassword = await bcrypt.hash(senha, await bcrypt.genSalt(10));
  await new User({
    nome,
    email,
    senha: hashedPassword,
    role: roleFinal,
    equipe: roleFinal === "agente" ? equipe : undefined,
    setores: setoresFinal,
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
