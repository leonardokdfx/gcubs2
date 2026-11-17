import { json, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { ipDe } from "@/server/portal";
import { enderecoDoCep, microareaDoCep } from "@/server/territorio";
import { somenteDigitos } from "@/utils/formatos";

export const dynamic = "force-dynamic";

// GET /api/portal/cep/:cep — público. Diz se o CEP faz parte do território da UBS.
export const GET = rota(async (req, { cep }) => {
  limitar(`cep:${ipDe(req)}`, 60, 10 * 60 * 1000);
  if (somenteDigitos(cep).length !== 8) return json({ message: "Informe o CEP completo (8 números)." }, 400);

  const microarea = await microareaDoCep(cep);
  if (!microarea) {
    return json({ atendido: false });
  }
  return json({
    atendido: true,
    equipe: microarea.equipe,
    microarea: microarea.numero,
    endereco: enderecoDoCep(microarea, cep),
  });
});
