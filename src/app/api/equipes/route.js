import { apenasSupervisor, autenticar, json, lerCorpo, rota } from "@/server/http";
import { criarEquipe, listarEquipes, vinculosDasEquipes } from "@/server/equipes";

export const dynamic = "force-dynamic";

// GET /api/equipes — lista das equipes (nome e ícone). É pública: a tela de login e o menu usam.
// Com ?detalhes=1, o supervisor recebe também quantos pacientes, ACS, microáreas e pedidos cada uma tem.
export const GET = rota(async (req) => {
  const equipes = await listarEquipes();
  const lista = equipes.map((e) => ({ _id: e._id, nome: e.nome, icone: e.icone, ordem: e.ordem }));
  if (new URL(req.url).searchParams.get("detalhes")) {
    apenasSupervisor(await autenticar(req));
    const vinculos = await vinculosDasEquipes(equipes);
    return json(lista.map((e) => ({ ...e, vinculos: vinculos[e.nome] })));
  }
  return json(lista);
});

// POST /api/equipes { nome, icone } — cria uma equipe (supervisor).
export const POST = rota(async (req) => {
  apenasSupervisor(await autenticar(req));
  const equipe = await criarEquipe(await lerCorpo(req));
  return json({ message: `Equipe ${equipe.nome} criada`, equipe }, 201);
});
