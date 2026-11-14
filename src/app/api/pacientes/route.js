import Paciente from "@/server/models/paciente";
import { autenticar, json, lerCorpo, podeAcessarEquipe, rota } from "@/server/http";
import { responsavelValido } from "@/server/pacientes";

// Cadastrar paciente
export const POST = rota(async (req) => {
  const user = autenticar(req);
  const body = await lerCorpo(req);

  if (!podeAcessarEquipe(user, body.equipe)) {
    return json({ message: "Você só pode cadastrar pacientes na sua equipe" }, 403);
  }
  if (!(await responsavelValido(body.responsavel, body.equipe))) {
    return json({ message: "Selecione um responsável cadastrado nesta equipe" }, 400);
  }

  try {
    const paciente = new Paciente({ ...body, criadoPor: user.id });
    await paciente.save();
    return json({ message: "Paciente cadastrado com sucesso!", paciente }, 201);
  } catch (err) {
    if (err.code === 11000) return json({ message: "Já existe um paciente cadastrado com este CPF" }, 400);
    return json({ message: "Erro ao cadastrar paciente", error: err.message }, 400);
  }
});
