import { json, rota } from "@/server/http";
import { listarSetores, setorPublico } from "@/server/setores";

export const dynamic = "force-dynamic";

// GET /api/portal/unidade — público. Funcionamento de hoje da farmácia, laboratório, odontologia,
// vacinação e IPE, para o paciente saber antes de sair de casa e evitar fila.
export const GET = rota(async () => {
  const setores = await listarSetores();
  return json({ setores: setores.map(setorPublico), agora: new Date() });
});
