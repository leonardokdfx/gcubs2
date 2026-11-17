import Microarea from "@/server/models/microarea";
import Agendamento from "@/server/models/agendamento";
import User from "@/server/models/user";
import { apenasSupervisor, autenticar, json, lerCorpo, rota } from "@/server/http";
import { rotuloMicroarea } from "@/utils/formatos";
import { dadosDaMicroarea } from "@/server/territorio";

// PUT /api/territorio/:id — edita a microárea (supervisor).
export const PUT = rota(async (req, { id }) => {
  const user = autenticar(req);
  apenasSupervisor(user);
  const existente = await Microarea.findById(id).catch(() => null);
  if (!existente) return json({ message: "Microárea não encontrada" }, 404);
  const dados = await dadosDaMicroarea(await lerCorpo(req), existente._id);
  try {
    const antes = { equipe: existente.equipe, numero: existente.numero };
    Object.assign(existente, dados);
    await existente.save();
    // Pedidos ainda não assumidos acompanham a microárea: novo ACS, número ou equipe.
    const novoAgente = dados.agente ? await User.findById(dados.agente).select("nome") : null;
    await Agendamento.updateMany(
      { equipe: antes.equipe, microarea: antes.numero, situacao: "Aguardando" },
      {
        equipe: dados.equipe,
        microarea: dados.numero,
        agente: novoAgente?._id ?? null,
        responsavel: novoAgente?.nome ?? null,
        atualizadoEm: new Date(),
      }
    );
    return json({ message: "Microárea salva", microarea: existente });
  } catch (err) {
    if (err.code === 11000) return json({ message: `A equipe ${dados.equipe} já tem a ${rotuloMicroarea(dados.numero).toLowerCase()}` }, 400);
    throw err;
  }
});

// DELETE /api/territorio/:id — remove a microárea (os pacientes mantêm o número gravado).
export const DELETE = rota(async (req, { id }) => {
  const user = autenticar(req);
  apenasSupervisor(user);
  const removida = await Microarea.findByIdAndDelete(id).catch(() => null);
  if (!removida) return json({ message: "Microárea não encontrada" }, 404);
  return json({ message: "Microárea removida" });
});
