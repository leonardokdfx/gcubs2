import Agendamento from "@/server/models/agendamento";
import { json, lerCorpo, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { ipDe, pedidosDoPaciente } from "@/server/portal";

// POST /api/portal/cancelar { id, cpf, dataNascimento } — o paciente cancela o próprio pedido.
export const POST = rota(async (req) => {
  limitar(`consulta:${ipDe(req)}`, 15, 15 * 60 * 1000);
  const { id, cpf, dataNascimento } = await lerCorpo(req);
  if (!/^[a-f0-9]{24}$/i.test(String(id || ""))) return json({ message: "Pedido não encontrado" }, 404);
  const lista = await pedidosDoPaciente(cpf, dataNascimento, { _id: id });
  const pedido = lista?.[0];
  if (!pedido) return json({ message: "Pedido não encontrado" }, 404);
  if (!["Aguardando", "Confirmado"].includes(pedido.situacao)) {
    return json({ message: "Este pedido não pode mais ser cancelado" }, 400);
  }
  await Agendamento.updateOne(
    { _id: pedido._id, situacao: { $in: ["Aguardando", "Confirmado"] } },
    { situacao: "Cancelado", canceladoPor: "paciente", motivoCancelamento: "Cancelado pelo paciente", atualizadoEm: new Date() }
  );
  return json({ message: "Pedido cancelado" });
});
