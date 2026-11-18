import Agendamento from "@/server/models/agendamento";
import { json, lerCorpo, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { ipDe, normalizarProtocolo, pedidosDoPaciente } from "@/server/portal";
import { EM_ANDAMENTO } from "@/utils/agendamento";

// POST /api/portal/cancelar { id, protocolo, cpf, dataNascimento } — o paciente cancela o próprio pedido.
// Além do CPF e da data de nascimento, exige o protocolo completo recebido no pedido (R-03).
export const POST = rota(async (req) => {
  limitar(`consulta:${ipDe(req)}`, 15, 15 * 60 * 1000);
  const { id, protocolo, cpf, dataNascimento } = await lerCorpo(req);
  if (!/^[a-f0-9]{24}$/i.test(String(id || ""))) return json({ message: "Pedido não encontrado" }, 404);
  const protocoloInformado = normalizarProtocolo(protocolo);
  if (protocoloInformado.length !== 6) return json({ message: "Informe o protocolo completo do pedido (6 letras e números)." }, 400);
  const lista = await pedidosDoPaciente(cpf, dataNascimento, { _id: id, protocolo: protocoloInformado });
  const pedido = lista?.[0];
  if (!pedido) return json({ message: "Protocolo incorreto. Confira o código recebido quando fez o pedido." }, 404);
  if (!EM_ANDAMENTO.includes(pedido.situacao)) {
    return json({ message: "Este pedido não pode mais ser cancelado" }, 400);
  }
  await Agendamento.updateOne(
    { _id: pedido._id, situacao: { $in: EM_ANDAMENTO } },
    {
      $set: { situacao: "Cancelado", canceladoPor: "paciente", motivoCancelamento: "Cancelado pelo paciente", atualizadoEm: new Date() },
      $push: { historico: { tipo: "cancelado", em: new Date(), por: "paciente" } },
    }
  );
  return json({ message: "Pedido cancelado" });
});
