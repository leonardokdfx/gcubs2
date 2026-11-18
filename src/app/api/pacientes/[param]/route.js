import Paciente from "@/server/models/paciente";
import { equipeExiste } from "@/server/equipes";
import { autenticar, json, lerCorpo, podeAcessarEquipe, rota } from "@/server/http";
import { camposPaciente, responsavelValido } from "@/server/pacientes";

export const dynamic = "force-dynamic";

// GET /api/pacientes/:equipe — lista os pacientes de uma equipe
export const GET = rota(async (req, { param: equipe }) => {
  const user = await autenticar(req);
  if (!podeAcessarEquipe(user, equipe)) {
    return json({ message: "Você não tem acesso a esta equipe" }, 403);
  }
  return json(await Paciente.find({ equipe }).sort({ nome: 1 }));
});

async function buscarComAcesso(user, id) {
  const existente = await Paciente.findById(id).catch(() => null);
  if (!existente) return { erro: json({ message: "Paciente não encontrado" }, 404) };
  if (!podeAcessarEquipe(user, existente.equipe)) {
    return { erro: json({ message: "Você não tem acesso a este paciente" }, 403) };
  }
  return { existente };
}

// PUT /api/pacientes/:id — edita um paciente
export const PUT = rota(async (req, { param: id }) => {
  const user = await autenticar(req);
  const { existente, erro } = await buscarComAcesso(user, id);
  if (erro) return erro;

  const body = camposPaciente(await lerCorpo(req));
  if (user.role !== "supervisor" && body.equipe && body.equipe !== existente.equipe) {
    return json({ message: "Você não pode mudar o paciente de equipe" }, 403);
  }
  if (body.equipe && body.equipe !== existente.equipe && !(await equipeExiste(body.equipe))) {
    return json({ message: "Selecione uma equipe cadastrada" }, 400);
  }
  if (
    body.responsavel !== undefined &&
    !(await responsavelValido(body.responsavel, body.equipe || existente.equipe))
  ) {
    return json({ message: "Selecione um responsável cadastrado nesta equipe" }, 400);
  }

  try {
    // runValidators: as listas fechadas (equipe, situação, grupos) também valem na edição.
    const paciente = await Paciente.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });
    return json({ message: "Paciente atualizado com sucesso!", paciente });
  } catch (err) {
    if (err.code === 11000) return json({ message: "Já existe um paciente cadastrado com este CPF" }, 400);
    if (err.name === "ValidationError" || err.name === "CastError") return json({ message: "Confira os campos do cadastro: há valores inválidos." }, 400);
    throw err;
  }
});

// DELETE /api/pacientes/:id
export const DELETE = rota(async (req, { param: id }) => {
  const user = await autenticar(req);
  const { erro } = await buscarComAcesso(user, id);
  if (erro) return erro;
  await Paciente.findByIdAndDelete(id);
  return json({ message: "Paciente removido com sucesso!" });
});
