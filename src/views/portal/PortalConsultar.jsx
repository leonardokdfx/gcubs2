"use client";

import React, { useState } from "react";
import { ClipboardList } from "lucide-react";
import api from "../../services/api";
import PortalLayout from "../../components/PortalLayout";
import AgendamentoTag from "../../components/AgendamentoTag";
import { EtapasRastreio, HistoricoRastreio } from "../../components/RastreioPedido";
import { PainelAtendimento } from "../../components/Presenca";
import { Alert, Button, ButtonLink, EmptyState, Field, PageHeader, Section } from "../../components/ui";
import { ConfirmDialog, useToast } from "../../components/feedback";
import { cpfValido, mascaraCPF } from "../../utils/formatos";
import { EM_ANDAMENTO, HORARIOS, MAX_TENTATIVAS, erroNascimento, exibirData, hojeNoFuso } from "../../utils/agendamento";

/** O que o paciente precisa saber agora, em destaque acima da linha do tempo. */
function Situacao({ pedido }) {
  const agente = pedido.responsavel ? `${pedido.responsavel} (ACS)` : "O agente de saúde da sua área";
  const visita =
    pedido.dataAgendada &&
    `${exibirData(pedido.dataAgendada)}, ${pedido.periodoAgendado?.toLowerCase()}${HORARIOS.includes(pedido.melhorHorario) ? ` (você prefere por volta das ${pedido.melhorHorario})` : ""}`;
  switch (pedido.situacao) {
    case "Aguardando":
      return (
        <Alert type="info" title="Aguardando agendamento">
          {agente} vai entrar em contato por telefone ou WhatsApp para confirmar o dia da visita. Você pediu {exibirData(pedido.dataPreferida)},{" "}
          {pedido.periodoPreferido?.toLowerCase()}.
        </Alert>
      );
    case "Confirmado":
      return (
        <Alert type="info" title={`Visita marcada: ${visita}`}>
          {agente} vai até a sua casa. Deixe à mão um documento com foto, o CPF e o Cartão SUS de quem mora com você.
        </Alert>
      );
    case "ACaminho":
      return (
        <Alert type="info" title="Agente a caminho">
          {agente} saiu para fazer as visitas de hoje. Alguém precisa estar em casa para receber a visita.
        </Alert>
      );
    case "Ausente":
      return (
        <Alert type="warning" title={`Ninguém em casa · ${pedido.tentativas} de ${MAX_TENTATIVAS} tentativas`}>
          {agente} foi até a sua casa e não encontrou ninguém. A equipe vai entrar em contato para marcar outro dia. Depois de {MAX_TENTATIVAS} tentativas sem
          encontrar ninguém, o pedido é encerrado.
        </Alert>
      );
    case "Cadastrado":
      return (
        <Alert type="success" title="Visita realizada: você já pode marcar sua consulta">
          Seu cadastro na equipe {pedido.equipe} foi concluído. Procure a UBS para marcar sua consulta. Leve um documento com foto e o Cartão SUS.
        </Alert>
      );
    case "Recusada":
      return (
        <Alert type="warning" title="Visita recusada">
          A visita de cadastro não foi feita. Se mudar de ideia, faça um novo pedido ou procure a UBS.
        </Alert>
      );
    case "Cancelado":
      return (
        <Alert type="warning" title="Pedido encerrado">
          {pedido.canceladoPor === "paciente" ? "Você cancelou este pedido." : pedido.motivoCancelamento || "O pedido foi cancelado pela equipe."} Se ainda
          precisa do cadastro, faça um novo pedido ou procure a UBS.
        </Alert>
      );
    default:
      return null;
  }
}

function Pedido({ pedido, onCancelar }) {
  return (
    <section className="paper rastreio" style={{ padding: "var(--space-5)" }} aria-labelledby={`pedido-${pedido._id}`}>
      <div className="rastreio__resumo">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <h2 className="list-item__title" id={`pedido-${pedido._id}`} style={{ margin: 0 }}>
            Protocolo <span className="num">{pedido.protocolo}</span>
          </h2>
          <AgendamentoTag situacao={pedido.situacao} />
        </div>
        <span className="field__hint" style={{ margin: 0 }}>
          Pedido feito em {exibirData(pedido.criadoEm, { day: "2-digit", month: "2-digit", year: "numeric" })}
          {pedido.equipe && ` · Equipe ${pedido.equipe}`}
          {pedido.responsavel && ` · Agente ${pedido.responsavel}`}
        </span>
      </div>

      <EtapasRastreio pedido={pedido} />
      <Situacao pedido={pedido} />

      <div>
        <h3 className="field__label" style={{ marginBottom: "var(--space-3)" }}>
          Histórico
        </h3>
        <HistoricoRastreio pedido={pedido} />
      </div>

      {EM_ANDAMENTO.includes(pedido.situacao) && (
        <div>
          <Button size="sm" variant="ghost" className="btn--danger-text" onClick={() => onCancelar(pedido)}>
            Cancelar pedido
          </Button>
        </div>
      )}
      {["Recusada", "Cancelado"].includes(pedido.situacao) && (
        <div>
          <ButtonLink to="/paciente/pedir" size="sm">
            Fazer um novo pedido
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

function PortalConsultar() {
  const toast = useToast();
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pedidos, setPedidos] = useState(null);
  const [atendimento, setAtendimento] = useState(null);
  const [cancelando, setCancelando] = useState(null);
  const [protocoloCancelar, setProtocoloCancelar] = useState("");
  const [enviando, setEnviando] = useState(false);

  const buscar = async (e) => {
    e?.preventDefault();
    setErro("");
    const novos = {};
    if (!cpfValido(cpf)) novos.cpf = cpf ? "CPF inválido. Confira os 11 dígitos." : "Informe seu CPF.";
    const msg = erroNascimento(nascimento);
    if (msg) novos.dataNascimento = msg;
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      document.getElementById(novos.cpf ? "consulta-cpf" : "consulta-nascimento")?.focus();
      return;
    }
    setBuscando(true);
    try {
      const resposta = await api.post("/portal/consulta", { cpf, dataNascimento: nascimento }, { auth: false });
      setPedidos(resposta.pedidos || []);
      setAtendimento(resposta.atendimento || null);
    } catch (err) {
      setErro(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const cancelar = async () => {
    setEnviando(true);
    try {
      await api.post("/portal/cancelar", { id: cancelando._id, protocolo: protocoloCancelar, cpf, dataNascimento: nascimento }, { auth: false });
      toast.sucesso("Pedido cancelado.");
      setCancelando(null);
      setProtocoloCancelar("");
      await buscar();
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PortalLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/paciente" }, { label: "Acompanhamento" }]}
        title="Acompanhamento"
        description="Veja cada passo do seu pedido de cadastro e se o médico e o enfermeiro da sua equipe estão atendendo. Use seu CPF e sua data de nascimento."
      />

      <div className="stack">
        <form onSubmit={buscar} noValidate>
          <Section>
            <div className="form-grid">
              <Field className="span-3" label="CPF" htmlFor="consulta-cpf" error={erros.cpf}>
                {(props) => (
                  <input
                    {...props}
                    className="input num"
                    value={cpf}
                    onChange={(e) => setCpf(mascaraCPF(e.target.value))}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    autoComplete="off"
                  />
                )}
              </Field>
              <Field className="span-3" label="Data de nascimento" htmlFor="consulta-nascimento" error={erros.dataNascimento}>
                {(props) => (
                  <input {...props} type="date" className="input" max={hojeNoFuso()} value={nascimento} onChange={(e) => setNascimento(e.target.value)} suppressHydrationWarning />
                )}
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button type="submit" variant="primary" loading={buscando} loadingText="Buscando…">
                Consultar
              </Button>
            </div>
          </Section>
        </form>

        {erro && <Alert type="danger">{erro}</Alert>}

        <PainelAtendimento atendimento={atendimento} />

        {pedidos && pedidos.length === 0 && !atendimento && (
          <div className="paper">
            <EmptyState
              icon={ClipboardList}
              title="Nenhum pedido encontrado"
              action={
                <ButtonLink to="/paciente/pedir" variant="primary">
                  Pedir meu cadastro
                </ButtonLink>
              }
            >
              Confira o CPF e a data de nascimento. Se você ainda não pediu o cadastro, faça o pedido agora.
            </EmptyState>
          </div>
        )}

        {pedidos && pedidos.length > 0 && (
          <div className="stack">
            {pedidos.map((p) => (
              <Pedido key={p._id} pedido={p} onCancelar={setCancelando} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelando}
        danger
        title="Cancelar pedido?"
        confirmLabel="Cancelar pedido"
        cancelLabel="Voltar"
        loading={enviando}
        onConfirm={cancelar}
        onCancel={() => {
          setCancelando(null);
          setProtocoloCancelar("");
        }}
      >
        <p style={{ margin: 0 }}>O agente não vai mais visitar sua casa para fazer o cadastro. Você pode fazer um novo pedido depois.</p>
        <p style={{ margin: "var(--space-3) 0 var(--space-2)" }}>
          Para sua segurança, digite o protocolo completo que você recebeu ao fazer o pedido (termina em{" "}
          <span className="num">{cancelando?.protocolo?.slice(-2)}</span>). Se não tiver mais o protocolo, procure a UBS ou seu ACS.
        </p>
        <label className="field__label" htmlFor="cancelar-protocolo">
          Protocolo
        </label>
        <input
          id="cancelar-protocolo"
          className="input num"
          value={protocoloCancelar}
          onChange={(e) => setProtocoloCancelar(e.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 6))}
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </ConfirmDialog>
    </PortalLayout>
  );
}

export default PortalConsultar;
