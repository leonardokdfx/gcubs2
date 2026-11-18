import Paciente from "@/server/models/paciente";
import { autenticar, json, lerCorpo, podeAcessarEquipe, rota } from "@/server/http";
import { camposPaciente, responsavelValido } from "@/server/pacientes";
import { equipeExiste } from "@/server/equipes";

// Cadastrar paciente
export const POST = rota(async (req) => {
  const user = await autenticar(req);
  const body = camposPaciente(await lerCorpo(req));

  if (!podeAcessarEquipe(user, body.equipe)) {
    return json({ message: "Você só pode cadastrar pacientes na sua equipe" }, 403);
  }
  if (!(await equipeExiste(body.equipe))) return json({ message: "Selecione uma equipe cadastrada" }, 400);
  if (!(await responsavelValido(body.responsavel, body.equipe))) {
    return json({ message: "Selecione um responsável cadastrado nesta equipe" }, 400);
  }

  try {
    const paciente = new Paciente({ ...body, criadoPor: user.id });
    await paciente.save();
    return json({ message: "Paciente cadastrado com sucesso!", paciente }, 201);
  } catch (err) {
    if (err.code === 11000) return json({ message: "Já existe um paciente cadastrado com este CPF" }, 400);
    if (err.name === "ValidationError") return json({ message: "Confira os campos do cadastro: há valores inválidos." }, 400);
    throw err;
  }
});
