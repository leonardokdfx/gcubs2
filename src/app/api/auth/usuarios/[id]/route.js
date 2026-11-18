import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "@/server/models/user";
import Paciente from "@/server/models/paciente";
import { apenasSupervisor, autenticar, json, lerCorpo, rota } from "@/server/http";
import { CHAVES_SETORES } from "@/utils/setores";
import { equipeExiste } from "@/server/equipes";
import { erroSenha } from "@/utils/senha";


export const dynamic = "force-dynamic";

export const PUT = rota(async (req, { id }) => {
  const supervisor = await autenticar(req);
  apenasSupervisor(supervisor);

  if (!mongoose.isValidObjectId(id)) return json({ message: "Usuário inválido" }, 400);
  if (String(supervisor.id) === String(id)) {
    return json({ message: "Edite sua própria conta pela tela Meu perfil" }, 403);
  }

  const user = await User.findById(id);
  if (!user) return json({ message: "Usuário não encontrado" }, 404);

  const { nome: nomeRecebido, email: emailRecebido, role, equipe, senha, setores } = await lerCorpo(req);
  const nome = typeof nomeRecebido === "string" ? nomeRecebido.trim() : "";
  const email = typeof emailRecebido === "string" ? emailRecebido.trim().toLowerCase() : "";

  if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ message: "Informe um nome e um e-mail válido" }, 400);
  }
  if (!["agente", "supervisor", "setor"].includes(role)) {
    return json({ message: "Papel de usuário inválido" }, 400);
  }
  const setoresFinal = role === "setor" ? [...new Set((Array.isArray(setores) ? setores : []).filter((s) => CHAVES_SETORES.includes(s)))] : undefined;
  if (role === "setor" && setoresFinal.length === 0) {
    return json({ message: "Escolha os setores que esta conta atualiza" }, 400);
  }
  if (role === "agente" && !(await equipeExiste(equipe))) {
    return json({ message: "Selecione uma equipe válida para o agente" }, 400);
  }
  if (senha !== undefined && senha !== "" && erroSenha(senha)) {
    return json({ message: erroSenha(senha) }, 400);
  }

  const emailEmUso = await User.findOne({ email, _id: { $ne: user._id } });
  if (emailEmUso) return json({ message: "Email já cadastrado" }, 400);

  if (user.role === "supervisor" && role !== "supervisor" && (await User.countDocuments({ role: "supervisor" })) <= 1) {
    return json({ message: "O sistema precisa manter pelo menos um supervisor" }, 400);
  }

  const nomeAnterior = user.nome;
  const equipeAnterior = user.equipe;
  const pacientesVinculados = user.role === "agente"
    ? await Paciente.countDocuments({ responsavel: nomeAnterior, equipe: equipeAnterior })
    : 0;
  const mudouVinculo = user.role !== role || (role === "agente" && equipeAnterior !== equipe);
  if (pacientesVinculados && mudouVinculo) {
    return json({ message: "Este agente possui pacientes vinculados. Reatribua os pacientes antes de alterar o papel ou a equipe." }, 409);
  }

  const mudouNome = nomeAnterior !== nome;
  if (pacientesVinculados && mudouNome) {
    const nomeDuplicado = await User.exists({
      _id: { $ne: user._id },
      role: "agente",
      equipe: equipeAnterior,
      nome: nomeAnterior,
    });
    if (nomeDuplicado) {
      return json({ message: "Há outro agente com o mesmo nome nesta equipe; não é possível atualizar os pacientes vinculados com segurança." }, 409);
    }
  }

  user.nome = nome;
  user.email = email;
  user.role = role;
  user.equipe = role === "agente" ? equipe : undefined;
  user.setores = setoresFinal;
  if (senha) user.senha = await bcrypt.hash(senha, await bcrypt.genSalt(10));
  await user.save();

  if (pacientesVinculados && mudouNome) {
    await Paciente.updateMany(
      { responsavel: nomeAnterior, equipe: equipeAnterior },
      { $set: { responsavel: nome } }
    );
  }

  return json({ message: "Usuário atualizado com sucesso" });
});

export const DELETE = rota(async (req, { id }) => {
  const supervisor = await autenticar(req);
  apenasSupervisor(supervisor);

  if (!mongoose.isValidObjectId(id)) return json({ message: "Usuário inválido" }, 400);
  if (String(supervisor.id) === String(id)) {
    return json({ message: "Não é possível excluir sua própria conta" }, 403);
  }

  const user = await User.findById(id);
  if (!user) return json({ message: "Usuário não encontrado" }, 404);

  if (user.role === "supervisor" && (await User.countDocuments({ role: "supervisor" })) <= 1) {
    return json({ message: "O sistema precisa manter pelo menos um supervisor" }, 400);
  }
  if (user.role === "agente" && await Paciente.exists({ responsavel: user.nome, equipe: user.equipe })) {
    return json({ message: "Este agente possui pacientes vinculados. Reatribua os pacientes antes de excluí-lo." }, 409);
  }

  await user.deleteOne();
  return json({ message: "Usuário excluído com sucesso" });
});
