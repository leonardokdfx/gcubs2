"use client";

import React from "react";
import { ChevronRight, ClipboardList, Search } from "lucide-react";
import { Link } from "../../lib/router";
import PortalLayout from "../../components/PortalLayout";
import { PageHeader, Section } from "../../components/ui";

const OPCOES = [
  {
    to: "/paciente/pedir",
    titulo: "Pedir meu cadastro",
    descricao: "Informe seu CEP, seus dados e o melhor dia para receber o agente comunitário de saúde.",
    Icone: ClipboardList,
  },
  {
    to: "/paciente/consultar",
    titulo: "Acompanhar meu pedido",
    descricao: "Veja se a visita já foi marcada, usando seu CPF e sua data de nascimento.",
    Icone: Search,
  },
];

const PASSOS = [
  "Digite o CEP da sua casa. O cadastro pelo site é só para endereços do território desta UBS.",
  "Preencha seus dados e escolha o dia e o período de preferência. Não precisa criar senha.",
  "O agente comunitário de saúde da sua área confirma a visita por telefone ou WhatsApp.",
  "Na visita, o agente conclui seu cadastro na equipe de saúde da família.",
];

function PortalInicio() {
  return (
    <PortalLayout>
      <PageHeader
        title="Cadastro na unidade de saúde"
        description="Moradores da área atendida pela UBS podem pedir o cadastro na equipe de Saúde da Família por aqui."
      />

      <div className="stack">
        <div className="paper">
          <ul className="option-list">
            {OPCOES.map((op) => (
              <li key={op.to}>
                <Link to={op.to} className="option">
                  <span className="option__icon" aria-hidden="true">
                    <op.Icone />
                  </span>
                  <span className="option__text">
                    <span className="option__title">{op.titulo}</span>
                    <span className="option__description">{op.descricao}</span>
                  </span>
                  <ChevronRight className="option__chevron" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Section title="Como funciona">
          <ol className="passos">
            {PASSOS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Section>
      </div>
    </PortalLayout>
  );
}

export default PortalInicio;
