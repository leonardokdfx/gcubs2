import Microarea from "@/server/models/microarea";
import { apenasSupervisor, autenticar, equipesAceitas, json, lerCorpo, rota } from "@/server/http";
import { dadosDaMicroarea } from "@/server/territorio";
import { rotuloMicroarea } from "@/utils/formatos";

export const dynamic = "force-dynamic";

// GET /api/territorio — microáreas visíveis ao usuário (agente: só a própria equipe).
export const GET = rota(async (req) => {
  const user = autenticar(req);
  const filtro = user.role === "supervisor" ? {} : { equipe: { $in: equipesAceitas(user.equipe) } };
  const lista = await Microarea.find(filtro).populate("agente", "nome").sort({ equipe: 1, numero: 1 });
  return json(lista);
});

// POST /api/territorio — cria uma microárea (supervisor).
export const POST = rota(async (req) => {
  const user = autenticar(req);
  apenasSupervisor(user);
  const dados = await dadosDaMicroarea(await lerCorpo(req));
  try {
    const microarea = await new Microarea(dados).save();
    return json({ message: "Microárea criada", microarea }, 201);
  } catch (err) {
    if (err.code === 11000) return json({ message: `A equipe ${dados.equipe} já tem a ${rotuloMicroarea(dados.numero).toLowerCase()}` }, 400);
    throw err;
  }
});
