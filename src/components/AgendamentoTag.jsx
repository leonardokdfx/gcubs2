"use client";

import React from "react";
import { CalendarCheck, CircleCheck, Clock, Ban } from "lucide-react";
import { SITUACOES_AGENDAMENTO } from "../utils/agendamento";

const ICONES = { Aguardando: Clock, Confirmado: CalendarCheck, Cadastrado: CircleCheck, Cancelado: Ban };

/** Situação do pedido de cadastro: sempre cor + ícone + texto. */
export default function AgendamentoTag({ situacao }) {
  const s = SITUACOES_AGENDAMENTO[situacao] || SITUACOES_AGENDAMENTO.Aguardando;
  const Icone = ICONES[situacao] || Clock;
  const props = s.tag === "primary" ? { className: "tag tag--primary" } : { className: "tag", "data-status": s.tag };
  return (
    <span {...props}>
      <Icone aria-hidden="true" />
      {s.rotulo}
    </span>
  );
}
