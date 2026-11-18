import Setor from "./models/setor";
import { HttpError } from "./http";
import { hojeNoFuso } from "@/utils/agendamento";
import {
  CHAVES_SETORES,
  MOTIVOS_FECHAMENTO,
  MOVIMENTOS,
  SETORES,
  SITUACOES_SETOR,
  SITUACOES_VAGA,
  URGENCIAS,
  lerFaltas,
  normalizarHorario,
  registroDeHoje,
} from "@/utils/setores";

const texto = (v, max) => String(v ?? "").trim().slice(0, max);
const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ""));

/** Setor ainda sem documento no banco: só o padrão de "como funciona", sem horário. */
const padrao = (chave) => ({ chave, acesso: SETORES[chave].acesso, horario: { dias: [], turnos: [] }, hoje: null, faltas: [], registros: [] });

/** Todos os setores, na ordem fixa, já com os que ainda não foram configurados. */
export async function listarSetores() {
  const docs = await Setor.find({ chave: { $in: CHAVES_SETORES } }).lean();
  const porChave = Object.fromEntries(docs.map((d) => [d.chave, d]));
  return CHAVES_SETORES.map((c) => porChave[c] || padrao(c));
}

/** Versão para o portal: sem o nome de quem atualizou. */
export function setorPublico(s) {
  const hoje = registroDeHoje(s);
  return {
    chave: s.chave,
    acesso: s.acesso || SETORES[s.chave].acesso,
    horario: s.horario || { dias: [], turnos: [] },
    hoje: hoje ? { ...hoje, atualizadoPor: undefined } : null,
    faltas: (s.faltas || []).map((f) => ({ nome: f.nome, desde: f.desde })),
    faltasEm: s.faltasEm || null,
  };
}

/** Supervisor mexe em todos; conta de setor só nos seus. */
export function podeEditar(user, chave) {
  return user.role === "supervisor" || (user.role === "setor" && (user.setores || []).includes(chave));
}

/**
 * Aplica uma atualização vinda da tela dos setores.
 * acao: "hoje" (situação/movimento/urgência/recado do dia), "faltas" (lista inteira),
 * "faltaAdicionar" / "faltaRemover" (um item) ou "configurar" (só supervisor).
 */
export async function atualizarSetor(chave, body, user) {
  if (!CHAVES_SETORES.includes(chave)) throw new HttpError(404, "Setor não encontrado");
  if (!podeEditar(user, chave)) throw new HttpError(403, "Você não pode atualizar este setor");
  const def = SETORES[chave];
  const setor = (await Setor.findOne({ chave })) || new Setor(padrao(chave));
  const agora = new Date();
  const anotacoes = []; // o que entra em "Atualizações de hoje"

  if (body.acao === "configurar") {
    if (user.role !== "supervisor") throw new HttpError(403, "Só o supervisor muda o horário do setor");
    const { horario, erro } = normalizarHorario(body.horario);
    if (erro) throw new HttpError(400, erro);
    setor.horario = horario;
    setor.acesso = texto(body.acesso, 300) || def.acesso;
    anotacoes.push("Horário do setor alterado");
  } else if (body.acao === "faltaAdicionar" || body.acao === "faltaRemover") {
    if (!def.faltas) throw new HttpError(400, "Este setor não tem lista de faltas");
    const nome = lerFaltas(body.nome)[0];
    if (!nome) throw new HttpError(400, "Informe o nome do item");
    const existente = (setor.faltas || []).find((f) => f.nome.toLowerCase() === nome.toLowerCase());
    if (body.acao === "faltaAdicionar" && existente) throw new HttpError(400, `"${existente.nome}" já está na lista de faltas`);
    if (body.acao === "faltaRemover" && !existente) throw new HttpError(404, `"${nome}" não está na lista de faltas`);
    const lista = (setor.faltas || []).filter((f) => f.nome.toLowerCase() !== nome.toLowerCase());
    if (body.acao === "faltaAdicionar") {
      if (lista.length >= 60) throw new HttpError(400, "A lista já tem 60 itens. Retire os que já chegaram.");
      lista.push({ nome, desde: agora });
      anotacoes.push(`Em falta: ${nome}`);
    } else {
      anotacoes.push(`Chegou / disponível: ${nome}`);
    }
    setor.faltas = lista;
    setor.faltasEm = agora;
    setor.faltasPor = user.nome;
  } else if (body.acao === "faltas") {
    if (!def.faltas) throw new HttpError(400, "Este setor não tem lista de faltas");
    const nomes = lerFaltas(body.faltasTexto);
    const antes = new Map((setor.faltas || []).map((f) => [f.nome.toLowerCase(), f.desde]));
    // Mantém a data de quando cada item entrou na lista.
    setor.faltas = nomes.map((nome) => ({ nome, desde: antes.get(nome.toLowerCase()) || agora }));
    setor.faltasEm = agora;
    setor.faltasPor = user.nome;
    anotacoes.push(`Lista de faltas atualizada (${nomes.length} ${nomes.length === 1 ? "item" : "itens"})`);
  } else if (body.acao === "hoje") {
    // Registro de outro dia não vale mais: começa do zero.
    const salvo = setor.toObject();
    const atual = registroDeHoje(salvo) ? { ...salvo.hoje } : {};
    const novo = { ...atual, data: new Date(`${hojeNoFuso()}T00:00:00Z`), atualizadoEm: agora, atualizadoPor: user.nome };

    if (body.situacao !== undefined) {
      const validas = def.tipo === "vaga" ? SITUACOES_VAGA : SITUACOES_SETOR;
      if (!validas[body.situacao]) throw new HttpError(400, "Situação inválida");
      novo.situacao = body.situacao;
      const precisaMotivo = ["fechado", "sem_atendimento"].includes(body.situacao);
      if (precisaMotivo && body.motivo && !MOTIVOS_FECHAMENTO[body.motivo]) throw new HttpError(400, "Motivo inválido");
      novo.motivo = precisaMotivo ? body.motivo || "" : "";
      if (body.situacao === "fechado" && body.voltaAs && !horaValida(body.voltaAs)) throw new HttpError(400, "Hora de volta inválida");
      novo.voltaAs = body.situacao === "fechado" ? body.voltaAs || "" : "";
      anotacoes.push(
        [validas[body.situacao], novo.motivo && MOTIVOS_FECHAMENTO[novo.motivo], novo.voltaAs && `volta às ${novo.voltaAs}`].filter(Boolean).join(" · ")
      );
      if (body.situacao !== "aberto") {
        novo.movimento = undefined;
        novo.movimentoEm = undefined;
      }
    }
    if (body.movimento !== undefined) {
      if (def.tipo !== "setor" || !MOVIMENTOS[body.movimento]) throw new HttpError(400, "Movimento inválido");
      novo.movimento = body.movimento;
      novo.movimentoEm = agora;
      anotacoes.push(MOVIMENTOS[body.movimento]);
      // Informar movimento é dizer que está atendendo.
      if (!["aberto"].includes(novo.situacao)) {
        novo.situacao = "aberto";
        novo.motivo = "";
        novo.voltaAs = "";
      }
    }
    if (body.urgencia !== undefined) {
      if (!def.urgencia || !URGENCIAS[body.urgencia]) throw new HttpError(400, "Urgência inválida");
      novo.urgencia = body.urgencia;
      anotacoes.push(URGENCIAS[body.urgencia]);
    }
    if (body.recado !== undefined) {
      novo.recado = texto(body.recado, 140);
      anotacoes.push(novo.recado ? `Recado: "${novo.recado}"` : "Recado removido");
    }
    setor.hoje = novo;
  } else {
    throw new HttpError(400, "Ação inválida");
  }

  // Histórico só do dia (no dia seguinte começa vazio), no máximo 50 linhas.
  const inicioDoDia = new Date(`${hojeNoFuso()}T03:00:00Z`); // meia-noite em Brasília
  const doDia = (setor.registros || []).filter((r) => new Date(r.em) >= inicioDoDia);
  setor.registros = [...anotacoes.map((t) => ({ em: agora, por: user.nome, texto: t })), ...doDia].slice(0, 50);

  setor.atualizadoEm = agora;
  await setor.save();
  return setor.toObject();
}
