"use client";

import React from "react";
import { Ban, CalendarCheck, CalendarClock, Check, CircleCheck, CircleX, DoorClosed, Footprints, Send, TriangleAlert, X } from "lucide-react";
import { ETAPAS_RASTREIO, MAX_TENTATIVAS, etapaDoPedido, exibirData, exibirDataHora, linhaDoTempo, ordinal } from "../utils/agendamento";

/** Texto de cada passo do rastreio, escrito para o paciente. */
function descrever(evento, pedido) {
  const agente = evento.por && evento.por !== "paciente" ? evento.por : "";
  const quando = evento.data ? `${exibirData(evento.data)}${evento.periodo ? `, ${evento.periodo.toLowerCase()}` : ""}` : "";
  switch (evento.tipo) {
    case "recebido":
      return { Icone: Send, titulo: "Pedido recebido", texto: `Seu pedido foi enviado para a equipe ${pedido.equipe || "da sua área"}.` };
    case "agendado":
      return { Icone: CalendarCheck, titulo: "Visita marcada", texto: [quando, agente && `com ${agente} (ACS)`].filter(Boolean).join(", ") };
    case "remarcado":
      return { Icone: CalendarClock, titulo: "Visita remarcada", texto: [quando && `Novo dia: ${quando}`, agente && `com ${agente} (ACS)`].filter(Boolean).join(", ") };
    case "a_caminho":
      return {
        Icone: Footprints,
        tom: "destaque",
        titulo: "Agente a caminho",
        texto: `${agente ? `${agente} (ACS)` : "O agente de saúde"} saiu para fazer as visitas. Alguém precisa estar em casa para receber a visita.`,
      };
    case "ausente":
      return {
        Icone: DoorClosed,
        tom: "alerta",
        titulo: `Ninguém em casa${evento.tentativa ? ` · ${ordinal(evento.tentativa)} tentativa` : ""}`,
        texto: "O agente de saúde foi até sua casa, mas ninguém atendeu. A equipe vai entrar em contato para marcar outro dia.",
      };
    case "realizada":
      return {
        Icone: CircleCheck,
        tom: "sucesso",
        titulo: "Visita realizada",
        texto: "Seu cadastro foi concluído. Você já pode procurar a UBS para marcar sua consulta.",
      };
    case "recusada":
      return { Icone: Ban, tom: "erro", titulo: "Visita recusada", texto: "A visita de cadastro não foi feita porque foi recusada." };
    case "encerrado":
      return {
        Icone: CircleX,
        tom: "erro",
        titulo: "Pedido encerrado",
        texto: `Ninguém foi encontrado em ${MAX_TENTATIVAS} tentativas. Procure a UBS ou faça um novo pedido.`,
        semNota: true,
      };
    case "cancelado":
      return {
        Icone: CircleX,
        tom: "erro",
        titulo: "Pedido cancelado",
        texto: evento.por === "paciente" ? "Você cancelou o pedido." : "O pedido foi cancelado pela equipe.",
        prefixoNota: "Motivo: ",
      };
    default:
      return { Icone: Check, titulo: evento.tipo, texto: "" };
  }
}

/** Barra com as 4 etapas: pedido recebido → visita marcada → agente a caminho → visita realizada. */
export function EtapasRastreio({ pedido }) {
  const { atual, estado } = etapaDoPedido(pedido);
  return (
    <ol className="rastreio-etapas" aria-label="Andamento do pedido">
      {ETAPAS_RASTREIO.map((rotulo, i) => {
        let marca = i < atual ? "feita" : i === atual ? "atual" : "futura";
        if (i === atual && estado === "concluido") marca = "concluida";
        if (i === atual && estado === "alerta") marca = "alerta";
        if (i === atual && estado === "interrompido") marca = "interrompida";
        const rotuloAtual = marca === "alerta" ? "Ninguém em casa" : marca === "interrompida" ? "Interrompido" : rotulo;
        const Icone = marca === "alerta" ? TriangleAlert : marca === "interrompida" ? X : Check;
        return (
          <li key={rotulo} className="rastreio-etapa" data-marca={marca} aria-current={i === atual ? "step" : undefined}>
            <span className="rastreio-etapa__marca" aria-hidden="true">
              {marca === "futura" || marca === "atual" ? <span className="rastreio-etapa__numero">{i + 1}</span> : <Icone strokeWidth={3} />}
            </span>
            <span className="rastreio-etapa__rotulo">
              {rotuloAtual}
              <span className="sr-only">
                {marca === "feita" || marca === "concluida" ? " (concluída)" : marca === "futura" ? " (ainda não)" : " (agora)"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Linha do tempo com data e hora de cada passo, do mais recente para o mais antigo. */
export function HistoricoRastreio({ pedido, rotulo = "Histórico do pedido" }) {
  const eventos = linhaDoTempo(pedido);
  return (
    <ol className="rastreio-historico" aria-label={rotulo}>
      {eventos.map((evento, i) => {
        const d = descrever(evento, pedido);
        const { dia, hora } = exibirDataHora(evento.em);
        return (
          <li key={`${evento.tipo}-${i}`} className="rastreio-evento" data-tom={d.tom} data-recente={i === 0 ? "true" : undefined}>
            <span className="rastreio-evento__quando">
              <span className="num">{dia}</span>
              {hora && <span className="num rastreio-evento__hora">{hora}</span>}
            </span>
            <span className="rastreio-evento__ponto" aria-hidden="true">
              <d.Icone />
            </span>
            <span className="rastreio-evento__corpo">
              <span className="rastreio-evento__titulo">{d.titulo}</span>
              {d.texto && <span className="rastreio-evento__texto">{d.texto}</span>}
              {evento.nota && !d.semNota && (
                <span className="rastreio-evento__nota">
                  {d.prefixoNota || "Recado do agente: "}“{evento.nota}”
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
