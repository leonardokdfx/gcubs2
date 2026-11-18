import Agendamento from "@/server/models/agendamento";
import Paciente from "@/server/models/paciente";
import { json, lerCorpo, rota } from "@/server/http";
import { limitar } from "@/server/limite";
import { camposDoPedido, gerarProtocolo, ipDe, origemDe } from "@/server/portal";
import { agenteDaMicroarea, microareaDoCep } from "@/server/territorio";
import { EM_ANDAMENTO, validarPedido } from "@/utils/agendamento";
import { mascaraCPF, somenteDigitos } from "@/utils/formatos";

const MAX_POR_ORIGEM_24H = 5;

// POST /api/portal/pedidos — público, sem senha. O paciente pede o cadastro.
export const POST = rota(async (req) => {
  limitar(`pedido:${ipDe(req)}`, 10, 10 * 60 * 1000);
  const body = await lerCorpo(req);

  // Campo invisível para pessoas: se vier preenchido, é robô. Responde "ok" sem gravar.
  if (body.site) return json({ message: "Pedido enviado!", protocolo: "ENVIADO" }, 201);

  const erros = validarPedido(body);
  if (Object.keys(erros).length > 0) {
    return json({ message: Object.values(erros)[0], erros }, 400);
  }

  const microarea = await microareaDoCep(body.cep);
  if (!microarea) {
    return json(
      { message: "Este CEP não faz parte do território desta UBS. Procure a unidade de saúde de referência do seu endereço.", foraDoTerritorio: true },
      400
    );
  }

  const digitos = somenteDigitos(body.cpf);
  const cpf = mascaraCPF(digitos);

  if (await Paciente.exists({ cpf: { $in: [digitos, cpf] } })) {
    return json({ message: "Este CPF já consta no cadastro da unidade. Procure seu agente comunitário de saúde." }, 400);
  }
  const emAndamento = await Agendamento.findOne({ cpf, situacao: { $in: EM_ANDAMENTO } }).select("protocolo");
  if (emAndamento) {
    return json(
      { message: `Já existe um pedido em andamento para este CPF (protocolo ${emAndamento.protocolo}). Acompanhe em "Acompanhar meu pedido".` },
      400
    );
  }

  const origem = origemDe(req);
  const recentes = await Agendamento.countDocuments({ origem, criadoEm: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
  if (recentes >= MAX_POR_ORIGEM_24H) {
    return json({ message: "Muitos pedidos enviados deste aparelho hoje. Tente de novo amanhã ou procure a UBS." }, 429);
  }

  const agente = await agenteDaMicroarea(microarea);

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const pedido = await new Agendamento({
        ...camposDoPedido(body),
        cpf,
        dataNascimento: new Date(`${body.dataNascimento}T00:00:00Z`),
        dataPreferida: new Date(`${body.dataPreferida}T00:00:00Z`),
        protocolo: gerarProtocolo(),
        equipe: microarea.equipe,
        microarea: microarea.numero,
        agente: agente?._id,
        responsavel: agente?.nome,
        consentimentoEm: new Date(),
        origem,
        historico: [{ tipo: "recebido", em: new Date() }],
      }).save();
      return json({ message: "Pedido enviado!", protocolo: pedido.protocolo, equipe: pedido.equipe }, 201);
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.protocolo) continue; // protocolo repetido: gera outro
      throw err;
    }
  }
  return json({ message: "Não foi possível gerar o protocolo. Tente de novo." }, 500);
});
