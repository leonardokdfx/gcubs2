import Agendamento, { PERIODOS } from "@/server/models/agendamento";
import Paciente from "@/server/models/paciente";
import { autenticar, json, lerCorpo, podeAcessarEquipe, rota } from "@/server/http";
import { responsavelValido } from "@/server/pacientes";
import { equipeExiste } from "@/server/equipes";
import { EM_ANDAMENTO, MAX_TENTATIVAS, RESULTADOS_VISITA, hojeNoFuso } from "@/utils/agendamento";
import { somenteDigitos, mascaraCPF } from "@/utils/formatos";

const texto = (v, max = 300) => String(v ?? "").trim().slice(0, max);

/** Acrescenta um passo ao rastreio que o paciente acompanha. */
function registrar(ag, tipo, extra = {}) {
  ag.historico.push({ tipo, em: new Date(), ...extra });
}

/** Cria o paciente na lista da equipe a partir do pedido (ou reaproveita um já cadastrado com o mesmo CPF). */
async function pacienteDoPedido(ag, user) {
  const digitos = somenteDigitos(ag.cpf);
  const existente = await Paciente.findOne({ cpf: { $in: [digitos, mascaraCPF(digitos)] } }).select("_id");
  if (existente) return existente;
  const dados = ag.toObject();
  return new Paciente({
    dataHoje: new Date(`${hojeNoFuso()}T00:00:00Z`),
    responsavel: ag.responsavel || user.nome,
    nome: dados.nome,
    cpf: dados.cpf,
    telefone: dados.telefone,
    outroTelefone: dados.outroTelefone,
    dataNascimento: dados.dataNascimento,
    cns: dados.cns,
    cep: dados.cep,
    endereco: dados.endereco,
    numero: dados.numero,
    pontoReferencia: dados.pontoReferencia,
    trabalhador: dados.trabalhador || "Não", // o portal só cadastra quem não é trabalhador
    enderecoMoradia: dados.enderecoMoradia,
    melhorHorario: dados.melhorHorario,
    moradoresHomens: dados.moradoresHomens,
    moradoresMulheres: dados.moradoresMulheres,
    moradoresCriancas: dados.moradoresCriancas,
    gruposAtencao: dados.gruposAtencao,
    numeroSES: dados.numeroSES,
    observacao: dados.observacao,
    equipe: ag.equipe,
    microarea: ag.microarea,
    status: "Visita realizada", // o pedido só vira paciente depois da visita feita
    criadoPor: user.id,
  }).save();
}

// PUT /api/agendamentos/:id
// { acao: "confirmar" | "sair" | "resultado" | "cancelar", ... }
export const PUT = rota(async (req, { id }) => {
  const user = await autenticar(req);
  const ag = await Agendamento.findById(id).catch(() => null);
  if (!ag) return json({ message: "Pedido não encontrado" }, 404);

  // Depois de assumido por uma equipe, só ela (ou o supervisor) mexe no pedido.
  if (ag.equipe && !podeAcessarEquipe(user, ag.equipe)) {
    return json({ message: "Este pedido já foi assumido por outra equipe" }, 403);
  }

  const body = await lerCorpo(req);

  // Marcar ou remarcar a visita (também depois de "paciente ausente").
  if (body.acao === "confirmar") {
    if (!EM_ANDAMENTO.includes(ag.situacao)) {
      return json({ message: "Este pedido não está mais em andamento" }, 400);
    }
    // A equipe vem do território (CEP). Só pedidos antigos, sem equipe, aceitam escolha.
    const equipe = ag.equipe || (user.role === "supervisor" ? body.equipe : user.equipe);
    if (!(await equipeExiste(equipe))) return json({ message: "Selecione a equipe" }, 400);
    const agente = await responsavelValido(body.responsavel, equipe);
    if (!agente) {
      return json({ message: "Selecione um agente cadastrado nesta equipe" }, 400);
    }
    const data = String(body.dataAgendada || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(new Date(`${data}T00:00:00Z`).getTime())) {
      return json({ message: "Informe a data da visita" }, 400);
    }
    if (data < hojeNoFuso()) return json({ message: "A data da visita não pode estar no passado" }, 400);
    if (!PERIODOS.includes(body.periodoAgendado)) return json({ message: "Escolha manhã ou tarde" }, 400);

    const primeira = ag.situacao === "Aguardando";
    Object.assign(ag, {
      situacao: "Confirmado",
      equipe,
      agente: agente._id,
      responsavel: agente.nome,
      dataAgendada: new Date(`${data}T00:00:00Z`),
      periodoAgendado: body.periodoAgendado,
    });
    registrar(ag, primeira ? "agendado" : "remarcado", { por: agente.nome, data: ag.dataAgendada, periodo: ag.periodoAgendado });
    await ag.save();
    return json({ message: primeira ? "Visita marcada" : "Visita remarcada", agendamento: ag });
  }

  // O ACS saiu para as visitas: o paciente vê "agente a caminho".
  if (body.acao === "sair") {
    if (ag.situacao === "ACaminho") return json({ message: "O agente já está a caminho", agendamento: ag });
    if (ag.situacao !== "Confirmado") return json({ message: "Marque a visita antes de sair" }, 400);
    ag.situacao = "ACaminho";
    registrar(ag, "a_caminho", { por: ag.responsavel || user.nome });
    await ag.save();
    return json({ message: "Saída registrada", agendamento: ag });
  }

  // Resultado da visita: realizada, ausente ou recusada (os mesmos do e-SUS).
  if (body.acao === "resultado") {
    if (!["Confirmado", "ACaminho"].includes(ag.situacao)) {
      return json({ message: "Só dá para registrar o resultado de uma visita marcada" }, 400);
    }
    if (!RESULTADOS_VISITA.includes(body.resultado)) return json({ message: "Escolha o resultado da visita" }, 400);
    const nota = texto(body.nota, 300);
    const por = ag.responsavel || user.nome;

    if (body.resultado === "realizada") {
      const paciente = await pacienteDoPedido(ag, user);
      ag.situacao = "Cadastrado";
      ag.paciente = paciente._id;
      registrar(ag, "realizada", { por, nota });
      await ag.save();
      return json({ message: "Visita realizada e paciente incluído na equipe", agendamento: ag, pacienteId: paciente._id });
    }

    if (body.resultado === "recusada") {
      ag.situacao = "Recusada";
      registrar(ag, "recusada", { por, nota });
      await ag.save();
      return json({ message: "Visita recusada registrada", agendamento: ag });
    }

    // Ausente: conta a tentativa; na última, encerra o pedido.
    ag.tentativas = (ag.tentativas || 0) + 1;
    registrar(ag, "ausente", { por, nota, tentativa: ag.tentativas });
    if (ag.tentativas >= MAX_TENTATIVAS) {
      const motivo = `Ninguém foi encontrado em ${MAX_TENTATIVAS} tentativas de visita.`;
      Object.assign(ag, { situacao: "Cancelado", canceladoPor: "equipe", motivoCancelamento: motivo });
      registrar(ag, "encerrado", { nota: motivo });
      await ag.save();
      return json({ message: `Pedido encerrado após ${MAX_TENTATIVAS} tentativas`, agendamento: ag });
    }
    ag.situacao = "Ausente";
    await ag.save();
    return json({ message: "Ausência registrada. Remarque a visita.", agendamento: ag });
  }

  if (body.acao === "cancelar") {
    if (!EM_ANDAMENTO.includes(ag.situacao)) {
      return json({ message: "Este pedido não está mais em andamento" }, 400);
    }
    const motivo = texto(body.motivo, 300);
    if (!motivo) return json({ message: "Informe o motivo do cancelamento" }, 400);
    Object.assign(ag, { situacao: "Cancelado", canceladoPor: "equipe", motivoCancelamento: motivo });
    registrar(ag, "cancelado", { por: user.nome, nota: motivo });
    await ag.save();
    return json({ message: "Pedido cancelado", agendamento: ag });
  }

  return json({ message: "Ação inválida" }, 400);
});
