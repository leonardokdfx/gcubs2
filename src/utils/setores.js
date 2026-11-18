// Funcionamento dos setores da unidade (farmácia, laboratório, odontologia, vacinação, IPE),
// compartilhado entre a API, a tela dos setores e o portal do paciente.
// Objetivo: o paciente saber antes de sair de casa se o setor está atendendo, evitando filas.
import { hojeNoFuso } from "./agendamento";

const FUSO = "America/Sao_Paulo";

/**
 * tipo "setor": aberto / não recebe mais hoje / fechado agora / sem atendimento hoje, com movimento.
 * tipo "vaga": atendimento com vagas por dia (IPE: 1 por dia) — disponível / já realizado / sem atendimento.
 */
export const SETORES = {
  farmacia: { rotulo: "Farmácia", tipo: "setor", faltas: "Remédios em falta", acesso: "Retirada de medicamentos com receita." },
  laboratorio: { rotulo: "Laboratório (coleta)", tipo: "setor", acesso: "Coleta por ordem de chegada." },
  odontologia: {
    rotulo: "Odontologia",
    tipo: "setor",
    urgencia: true,
    acesso: "Atendimento com consulta marcada. A marcação de consultas e a urgência são por ordem de chegada.",
  },
  vacinacao: { rotulo: "Vacinação", tipo: "setor", faltas: "Vacinas em falta", acesso: "Por ordem de chegada. Leve o cartão de vacina." },
  ipe: { rotulo: "Atendimento IPE", tipo: "vaga", vagasPorDia: 1, acesso: "Um atendimento por dia, por ordem de chegada." },
};
export const CHAVES_SETORES = Object.keys(SETORES);

export const SITUACOES_SETOR = {
  aberto: "Aberto",
  encerrado: "Não recebe mais pacientes hoje",
  fechado: "Fechado agora",
  sem_atendimento: "Sem atendimento hoje",
};
export const SITUACOES_VAGA = {
  disponivel: "Disponível hoje",
  realizado: "Já realizado hoje",
  sem_atendimento: "Sem atendimento hoje",
};

/** Motivos que o paciente vê quando o setor fecha. Nada de detalhe pessoal de profissional. */
export const MOTIVOS_FECHAMENTO = {
  sem_sistema: "Sistema fora do ar",
  falta_profissional: "Sem profissional no momento",
  falta_insumo: "Falta de material",
  reuniao: "Reunião ou capacitação",
  almoco: "Intervalo",
  outro: "Outro motivo",
};

export const MOVIMENTOS = {
  tranquilo: "Movimento tranquilo",
  moderado: "Movimento moderado",
  cheio: "Movimento cheio",
};

export const URGENCIAS = {
  atendendo: "Urgência: atendendo",
  esgotada: "Urgência: vagas esgotadas hoje",
  sem: "Urgência: sem atendimento hoje",
};

/** O movimento informado vale por 1 hora; depois disso o portal deixa de mostrar, para não enganar. */
export const VALIDADE_MOVIMENTO_MIN = 60;

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Horários de meia em meia hora, das 6h às 22h, para abrir/fechar e "volta às". */
export const HORAS = Array.from({ length: 33 }, (_, i) => {
  const min = 6 * 60 + i * 30;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${min % 60 ? "30" : "00"}`;
});

const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ""));

/** Hora (HH:MM) e dia da semana (0 = domingo) no fuso da unidade. */
export function relogio(agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(agora)
      .map((p) => [p.type, p.value])
  );
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.weekday);
  return { hora: `${partes.hour}:${partes.minute}`, dia };
}

/** "07:00" → "7h"; "13:30" → "13h30". */
export function exibirHora(h) {
  if (!horaValida(h)) return "";
  const [hh, mm] = h.split(":");
  return `${Number(hh)}h${mm === "00" ? "" : mm}`;
}

/** Valida e normaliza o horário semanal enviado pelo supervisor. Retorna { horario } ou { erro }. */
export function normalizarHorario(h) {
  const dias = [...new Set((Array.isArray(h?.dias) ? h.dias : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  const turnos = [];
  for (const t of Array.isArray(h?.turnos) ? h.turnos.slice(0, 2) : []) {
    if (!t?.abre && !t?.fecha) continue;
    if (!horaValida(t.abre) || !horaValida(t.fecha)) return { erro: "Informe a hora de abrir e de fechar de cada turno." };
    if (t.abre >= t.fecha) return { erro: "A hora de fechar precisa ser depois da hora de abrir." };
    turnos.push({ abre: t.abre, fecha: t.fecha });
  }
  turnos.sort((a, b) => a.abre.localeCompare(b.abre));
  if (turnos.length === 2 && turnos[1].abre < turnos[0].fecha) return { erro: "Os dois turnos não podem se sobrepor." };
  if (turnos.length > 0 && dias.length === 0) return { erro: "Marque os dias em que o setor funciona." };
  return { horario: { dias, turnos } };
}

const temHorario = (s) => s?.horario?.turnos?.length > 0 && s?.horario?.dias?.length > 0;

/** "seg a sex · 7h às 12h e 13h às 17h" */
export function textoHorario(setor) {
  if (!temHorario(setor)) return "";
  const dias = [...setor.horario.dias].sort();
  const seguidos = dias.length > 2 && dias.every((d, i) => i === 0 || d === dias[i - 1] + 1);
  const textoDias = seguidos ? `${DIAS_CURTOS[dias[0]]} a ${DIAS_CURTOS[dias[dias.length - 1]]}` : dias.map((d) => DIAS_CURTOS[d]).join(", ");
  const turnos = setor.horario.turnos.map((t) => `${exibirHora(t.abre)} às ${exibirHora(t.fecha)}`).join(" e ");
  return `${textoDias} · ${turnos}`;
}

/** Próxima abertura a partir de agora: { hoje: bool, dia, hora } ou null. */
function proximaAbertura(setor, { hora, dia }) {
  if (!temHorario(setor)) return null;
  const { dias, turnos } = setor.horario;
  if (dias.includes(dia)) {
    const t = turnos.find((x) => x.abre > hora);
    if (t) return { hoje: true, dia, hora: t.abre };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    if (dias.includes(d)) return { hoje: false, amanha: i === 1, dia: d, hora: turnos[0].abre };
  }
  return null;
}

function textoAbertura(p) {
  if (!p) return "";
  if (p.hoje) return `Abre às ${exibirHora(p.hora)}`;
  return `Abre ${p.amanha ? "amanhã" : DIAS_SEMANA[p.dia].toLowerCase()} às ${exibirHora(p.hora)}`;
}

/** Registro do dia, só se for de hoje (de um dia para o outro tudo volta ao normal sozinho). */
export function registroDeHoje(setor, agora = new Date()) {
  const h = setor?.hoje;
  if (!h?.data) return null;
  const iso = new Date(h.data).toISOString().slice(0, 10);
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
  return iso === hoje ? h : null;
}

/**
 * O que o paciente vê agora para o setor.
 * Retorna { tom: "ok" | "alerta" | "fechado" | "neutro", titulo, detalhe, movimento?, urgencia? }.
 */
export function estadoDoSetor(setor, agora = new Date()) {
  const def = SETORES[setor.chave];
  const r = relogio(agora);
  const h = registroDeHoje(setor, agora);
  const turno = temHorario(setor) && setor.horario.dias.includes(r.dia) ? setor.horario.turnos.find((t) => t.abre <= r.hora && r.hora < t.fecha) : null;
  const abertura = proximaAbertura(setor, r);
  const motivo = h?.motivo ? MOTIVOS_FECHAMENTO[h.motivo] : "";
  const recado = h?.recado || "";
  const juntar = (...partes) => partes.filter(Boolean).join(" · ");

  if (h?.situacao === "sem_atendimento") {
    return { tom: "fechado", titulo: "Sem atendimento hoje", detalhe: juntar(motivo, textoAbertura(proximaAbertura(setor, { ...r, hora: "99:99" }))), recado };
  }

  // Fora do horário cadastrado vale o horário (evita "aberto" esquecido à noite).
  const foraDoHorario = temHorario(setor) && !turno;
  if (foraDoHorario) {
    const titulo = abertura?.hoje ? "Fechado agora" : setor.horario.dias.includes(r.dia) ? "Encerrado por hoje" : "Fechado hoje";
    return { tom: "neutro", titulo, detalhe: textoAbertura(abertura), recado };
  }

  if (def.tipo === "vaga") {
    if (h?.situacao === "realizado") {
      return { tom: "alerta", titulo: "Já realizado hoje", detalhe: `O atendimento do dia já foi feito. ${textoAbertura(proximaAbertura(setor, { ...r, hora: "99:99" })) || "Volte no próximo dia de atendimento."}`, recado };
    }
    if (!h && !temHorario(setor) && (r.dia === 0 || r.dia === 6)) return { tom: "neutro", titulo: "Sem atendimento hoje", detalhe: "Atendimento em dias úteis.", recado };
    const vagas = def.vagasPorDia === 1 ? "1 atendimento por dia" : `${def.vagasPorDia} atendimentos por dia`;
    return { tom: "ok", titulo: "Disponível hoje", detalhe: juntar(vagas, turno && `até ${exibirHora(turno.fecha)}`), recado };
  }

  if (h?.situacao === "encerrado") {
    return { tom: "alerta", titulo: "Não recebe mais pacientes hoje", detalhe: textoAbertura(proximaAbertura(setor, { ...r, hora: "99:99" })), recado };
  }
  if (h?.situacao === "fechado" && !(h.voltaAs && r.hora >= h.voltaAs)) {
    return { tom: "fechado", titulo: "Fechado agora", detalhe: juntar(h.voltaAs && `Volta às ${exibirHora(h.voltaAs)}`, motivo), recado };
  }

  // Aberto: pelo horário cadastrado ou porque o setor informou hoje.
  if (turno || h?.situacao === "aberto" || (h?.situacao === "fechado" && h.voltaAs)) {
    const fresco = h?.movimento && h.movimentoEm && agora - new Date(h.movimentoEm) <= VALIDADE_MOVIMENTO_MIN * 60 * 1000;
    return {
      tom: "ok",
      titulo: "Aberto agora",
      detalhe: turno ? `Fecha às ${exibirHora(turno.fecha)}` : "",
      movimento: fresco ? h.movimento : null,
      movimentoEm: fresco ? h.movimentoEm : null,
      urgencia: def.urgencia && h?.urgencia ? h.urgencia : null,
      recado,
    };
  }
  return { tom: "neutro", titulo: "Sem informação hoje", detalhe: "Ligue ou procure a recepção da unidade.", recado };
}

/** Lista de faltas digitada pelo setor (uma por linha) → nomes limpos, sem repetição. */
export function lerFaltas(texto) {
  const vistos = new Set();
  const nomes = [];
  for (const linha of String(texto || "").split(/\r?\n|;/)) {
    const nome = linha.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!nome || vistos.has(nome.toLowerCase())) continue;
    vistos.add(nome.toLowerCase());
    nomes.push(nome);
  }
  return nomes.slice(0, 60);
}

/** Resumo em texto para o ACS mandar pelo WhatsApp. */
export function resumoParaWhatsApp(setores, nomeUnidade, agora = new Date()) {
  const linhas = setores.map((s) => {
    const e = estadoDoSetor(s, agora);
    const extra = [e.movimento && MOVIMENTOS[e.movimento].toLowerCase(), e.urgencia && URGENCIAS[e.urgencia].toLowerCase(), e.detalhe].filter(Boolean).join(", ");
    const faltas = SETORES[s.chave].faltas && s.faltas?.length ? `\n   ${SETORES[s.chave].faltas}: ${s.faltas.map((f) => f.nome).join(", ")}` : "";
    return `• ${SETORES[s.chave].rotulo}: ${e.titulo}${extra ? ` (${extra})` : ""}${faltas}`;
  });
  return `${nomeUnidade} — funcionamento hoje (${relogio(agora).hora}):\n${linhas.join("\n")}`;
}

export { hojeNoFuso };
