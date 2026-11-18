import { HttpError, apenasSupervisor, autenticar, json, lerCorpo, rota } from "@/server/http";
import { editarEquipe, excluirEquipe } from "@/server/equipes";

// PUT /api/equipes/:id { nome, icone } — renomeia ou troca o ícone (supervisor).
// Ao renomear, pacientes, ACS, microáreas, pedidos e presenças passam a usar o nome novo.
export const PUT = rota(async (req, { id }) => {
  apenasSupervisor(await autenticar(req));
  const { equipe, renomeada, antigo } = await editarEquipe(id, await lerCorpo(req));
  return json({ message: renomeada ? `Equipe ${antigo} agora se chama ${equipe.nome}` : "Equipe salva", equipe });
});

// DELETE /api/equipes/:id?moverPara=Nome — exclui a equipe (supervisor).
// Se ela tem cadastros vinculados, eles vão para a equipe `moverPara`; sem isso, responde 409 com as contagens.
export const DELETE = rota(async (req, { id }) => {
  apenasSupervisor(await autenticar(req));
  const moverPara = new URL(req.url).searchParams.get("moverPara");
  try {
    const r = await excluirEquipe(id, moverPara);
    return json({ message: r.destino ? `Equipe ${r.nome} excluída. Os cadastros foram para a equipe ${r.destino}.` : `Equipe ${r.nome} excluída` });
  } catch (err) {
    if (err instanceof HttpError && err.vinculos) return json({ message: err.message, vinculos: err.vinculos }, err.status);
    throw err;
  }
});
