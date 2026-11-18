import { json, lerCorpo, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { equipeDoPaciente, ipDe, mascararProtocolo, pedidosDoPaciente } from "@/server/portal";
import { atendimentoDaEquipe } from "@/server/presenca";

// POST /api/portal/consulta { cpf, dataNascimento } — público.
// Devolve os pedidos de cadastro e, se o paciente tem equipe, a presença do médico e do enfermeiro dela.
export const POST = rota(async (req) => {
  limitar(`consulta:${ipDe(req)}`, 15, 15 * 60 * 1000);
  const { cpf, dataNascimento } = await lerCorpo(req);
  const pedidos = await pedidosDoPaciente(cpf, dataNascimento);
  if (pedidos === null) return json({ message: "Informe o CPF e a data de nascimento." }, 400);
  const vinculo = await equipeDoPaciente(cpf, dataNascimento, pedidos);
  const atendimento = vinculo ? { ...(await atendimentoDaEquipe(vinculo.equipe)), acs: vinculo.acs } : null;
  return json({ pedidos: pedidos.map(mascararProtocolo), atendimento });
});
