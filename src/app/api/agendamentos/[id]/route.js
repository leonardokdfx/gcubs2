import Agendamento, { PERIODOS } from "@/server/models/agendamento";
import Paciente from "@/server/models/paciente";
import { autenticar, json, lerCorpo, podeAcessarEquipe, rota } from "@/server/http";
import { responsavelValido } from "@/server/pacientes";
import { EQUIPES } from "@/server/constantes";
import { hojeNoFuso } from "@/utils/agendamento";
import { somenteDigitos, mascaraCPF } from "@/utils/formatos";

const EM_ANDAMENTO = ["Aguardando", "Confirmado"];

// PUT /api/agendamentos/:id  { acao: "confirmar" | "cadastrar" | "cancelar", ... }
export const PUT = rota(async (req, { id }) => {
  const user = autenticar(req);
  const ag = await Agendamento.findById(id).catch(() => null);
  if (!ag) return json({ message: "Pedido não encontrado" }, 404);

  // Depois de assumido por uma equipe, só ela (ou o supervisor) mexe no pedido.
  if (ag.equipe && !podeAcessarEquipe(user, ag.equipe)) {
    return json({ message: "Este pedido já foi assumido por outra equipe" }, 403);
  }

  const body = await lerCorpo(req);

  if (body.acao === "confirmar") {
    if (!EM_ANDAMENTO.includes(ag.situacao)) {
      return json({ message: "Este pedido não está mais em andamento" }, 400);
    }
    // A equipe vem do território (CEP). Só pedidos antigos, sem equipe, aceitam escolha.
    const equipe = ag.equipe || (user.role === "supervisor" ? body.equipe : user.equipe);
    if (!EQUIPES.includes(equipe)) return json({ message: "Selecione a equipe" }, 400);
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

    Object.assign(ag, {
      situacao: "Confirmado",
      equipe,
      agente: agente._id,
      responsavel: agente.nome,
      dataAgendada: new Date(`${data}T00:00:00Z`),
      periodoAgendado: body.periodoAgendado,
    });
    await ag.save();
    return json({ message: "Visita confirmada", agendamento: ag });
  }

  if (body.acao === "cadastrar") {
    if (ag.situacao !== "Confirmado") {
      return json({ message: "Confirme a visita antes de incluir o paciente na equipe" }, 400);
    }
    const digitos = somenteDigitos(ag.cpf);
    if (await Paciente.exists({ cpf: { $in: [digitos, mascaraCPF(digitos)] } })) {
      return json({ message: "Já existe um paciente cadastrado com este CPF" }, 400);
    }
    const dados = ag.toObject();
    const paciente = await new Paciente({
      dataHoje: new Date(`${hojeNoFuso()}T00:00:00Z`),
      responsavel: ag.responsavel,
      nome: dados.nome,
      cpf: dados.cpf,
      telefone: dados.telefone,
      dataNascimento: dados.dataNascimento,
      cns: dados.cns,
      cep: dados.cep,
      endereco: dados.endereco,
      numero: dados.numero,
      pontoReferencia: dados.pontoReferencia,
      trabalhador: dados.trabalhador,
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
      status: "",
      criadoPor: user.id,
    }).save();

    ag.situacao = "Cadastrado";
    ag.paciente = paciente._id;
    await ag.save();
    return json({ message: "Paciente incluído na equipe", agendamento: ag, pacienteId: paciente._id });
  }

  if (body.acao === "cancelar") {
    if (!EM_ANDAMENTO.includes(ag.situacao)) {
      return json({ message: "Este pedido não está mais em andamento" }, 400);
    }
    const motivo = String(body.motivo || "").trim().slice(0, 300);
    if (!motivo) return json({ message: "Informe o motivo do cancelamento" }, 400);
    Object.assign(ag, { situacao: "Cancelado", canceladoPor: "equipe", motivoCancelamento: motivo });
    await ag.save();
    return json({ message: "Pedido cancelado", agendamento: ag });
  }

  return json({ message: "Ação inválida" }, 400);
});
