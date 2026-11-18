"use client";

import React from "react";
import { CalendarCheck, ChevronRight, ClipboardList, Search, Store } from "lucide-react";
import { Link } from "../../lib/router";
import PortalLayout from "../../components/PortalLayout";
import { ButtonLink, PageHeader, Section } from "../../components/ui";
import { AvisoFuncionamento, PainelFuncionamento, useAgora, useFuncionamentoPublico } from "../../components/Funcionamento";
import { ENDERECO_UNIDADE, UNIDADE } from "../../constants/unidade";

const OPCOES = [
  {
    to: "/paciente/pedir",
    titulo: "Pedir meu cadastro",
    descricao: "Informe seu CEP, seus dados e o melhor dia para receber o agente comunitário de saúde.",
    Icone: ClipboardList,
  },
  {
    to: "/paciente/consultar",
    titulo: "Acompanhamento",
    descricao: "Veja como está seu pedido e se o médico e o enfermeiro da sua equipe estão atendendo, usando seu CPF e sua data de nascimento.",
    Icone: Search,
  },
  {
    to: "/paciente/consulta",
    titulo: "Vou à minha consulta?",
    descricao: "Tem consulta marcada na UBS? Avise se vai ou não. Se não puder ir, a vaga fica para outro paciente que precisa.",
    Icone: CalendarCheck,
  },
  {
    to: "/paciente/unidade",
    titulo: "Funcionamento hoje",
    descricao: "Farmácia, laboratório, odontologia, vacinação e IPE: veja se estão atendendo, o movimento e o que está em falta, antes de sair de casa.",
    Icone: Store,
  },
];

/** Resumo do funcionamento dos setores no topo do portal. */
function FuncionamentoHoje() {
  const agora = useAgora();
  const { setores } = useFuncionamentoPublico();
  if (!setores) return null;
  return (
    <Section
      title="Funcionamento hoje"
      description="Confira antes de ir para a unidade e evite fila."
      footer={
        <ButtonLink to="/paciente/unidade" variant="ghost" className="btn--primary-text">
          Ver horários e detalhes
          <ChevronRight aria-hidden="true" />
        </ButtonLink>
      }
    >
      <PainelFuncionamento setores={setores} agora={agora} compacto />
      <AvisoFuncionamento />
    </Section>
  );
}

const PASSOS = [
  "Digite o CEP da sua casa. O cadastro pelo site é só para endereços do território desta UBS.",
  "Preencha seus dados e escolha o dia e o período de preferência. Não precisa criar senha.",
  "O agente comunitário de saúde da sua área confirma a visita por telefone ou WhatsApp.",
  "Em \"Acompanhamento\" você vê cada passo, como num rastreio: visita marcada, agente a caminho e visita realizada.",
  "Depois da visita, seu cadastro está pronto e você já pode procurar a UBS para marcar consulta.",
  "Já tem consulta marcada? Em \"Acompanhamento\" você vê se o médico ou o enfermeiro da sua equipe vai faltar e precisa remarcar.",
  "Não vai poder ir à consulta? Avise em \"Vou à minha consulta?\": seu ACS passa para a equipe e a vaga fica para outro paciente.",
];

function PortalInicio() {
  return (
    <PortalLayout>
      <PageHeader
        title={`Área do paciente · ${UNIDADE.nome}`}
        description={`Moradores da área atendida pela ${UNIDADE.nome} (${ENDERECO_UNIDADE}) podem pedir o cadastro na equipe de Saúde da Família e acompanhar o atendimento por aqui.`}
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

        <FuncionamentoHoje />

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
