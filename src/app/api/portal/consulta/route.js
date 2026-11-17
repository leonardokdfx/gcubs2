import { json, lerCorpo, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { ipDe, pedidosDoPaciente } from "@/server/portal";

// POST /api/portal/consulta { cpf, dataNascimento } — público.
export const POST = rota(async (req) => {
  limitar(`consulta:${ipDe(req)}`, 15, 15 * 60 * 1000);
  const { cpf, dataNascimento } = await lerCorpo(req);
  const pedidos = await pedidosDoPaciente(cpf, dataNascimento);
  if (pedidos === null) return json({ message: "Informe o CPF e a data de nascimento." }, 400);
  return json(pedidos);
});
