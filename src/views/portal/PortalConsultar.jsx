"use client";

import React, { useState } from "react";
import { CalendarDays, ClipboardList, Hash, MessageSquare, UserRound } from "lucide-react";
import api from "../../services/api";
import PortalLayout from "../../components/PortalLayout";
import AgendamentoTag from "../../components/AgendamentoTag";
import { Alert, Button, ButtonLink, EmptyState, Field, PageHeader, Section } from "../../components/ui";
import { ConfirmDialog, useToast } from "../../components/feedback";
import { cpfValido, mascaraCPF } from "../../utils/formatos";
import { erroNascimento, exibirData, hojeNoFuso } from "../../utils/agendamento";

const EM_ANDAMENTO = ["Aguardando", "Confirmado"];

function Linha({ icone: Icone, children }) {
  return (
    <span className="list-item__meta-row">
      <Icone aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

function Pedido({ pedido, onCancelar }) {
  return (
    <li className="list-item">
      <div className="list-item__main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="list-item__title">Pedido de cadastro</span>
          <AgendamentoTag situacao={pedido.situacao} />
        </div>
        <div className="list-item__meta">
          <Linha icone={Hash}>
            Protocolo <strong className="num">{pedido.protocolo}</strong> · pedido em{" "}
            {exibirData(pedido.criadoEm, { day: "2-digit", month: "2-digit", year: "numeric" })}
          </Linha>
          {pedido.situacao === "Confirmado" ? (
            <Linha icone={CalendarDays}>
              <strong>
                Visita marcada: {exibirData(pedido.dataAgendada)}, {pedido.periodoAgendado?.toLowerCase()}
              </strong>
            </Linha>
          ) : (
            <Linha icone={CalendarDays}>
              Dia que você preferiu: {exibirData(pedido.dataPreferida)}, {pedido.periodoPreferido?.toLowerCase()}
            </Linha>
          )}
          {pedido.situacao !== "Cancelado" && (
            <Linha icone={UserRound}>
              Equipe {pedido.equipe}
              {pedido.responsavel && ` · Agente ${pedido.responsavel}`}
            </Linha>
          )}
          {pedido.situacao === "Cancelado" && pedido.motivoCancelamento && (
            <Linha icone={MessageSquare}>
              {pedido.canceladoPor === "equipe" ? "Motivo informado pela equipe: " : ""}
              {pedido.motivoCancelamento}
            </Linha>
          )}
        </div>
        {pedido.situacao === "Aguardando" && (
          <p className="field__hint" style={{ margin: 0 }}>
            O agente da sua área vai confirmar o dia da visita por telefone ou WhatsApp.
          </p>
        )}
        {pedido.situacao === "Cadastrado" && (
          <p className="field__hint" style={{ margin: 0 }}>
            Seu cadastro foi concluído. Você já faz parte da lista da equipe {pedido.equipe}.
          </p>
        )}
        {EM_ANDAMENTO.includes(pedido.situacao) && (
          <div className="list-item__actions">
            <Button size="sm" variant="ghost" className="btn--danger-text" onClick={() => onCancelar(pedido)}>
              Cancelar pedido
            </Button>
          </div>
        )}
      </div>
    </li>
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
  const [cancelando, setCancelando] = useState(null);
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
      setPedidos(await api.post("/portal/consulta", { cpf, dataNascimento: nascimento }, { auth: false }));
    } catch (err) {
      setErro(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const cancelar = async () => {
    setEnviando(true);
    try {
      await api.post("/portal/cancelar", { id: cancelando._id, cpf, dataNascimento: nascimento }, { auth: false });
      toast.sucesso("Pedido cancelado.");
      setCancelando(null);
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
        breadcrumb={[{ label: "Início", to: "/paciente" }, { label: "Acompanhar pedido" }]}
        title="Acompanhar meu pedido"
        description="Use o CPF e a data de nascimento informados no pedido."
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
                Ver meu pedido
              </Button>
            </div>
          </Section>
        </form>

        {erro && <Alert type="danger">{erro}</Alert>}

        {pedidos && pedidos.length === 0 && (
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
          <div className="paper list-paper">
            <ul className="list" aria-label="Meus pedidos de cadastro">
              {pedidos.map((p) => (
                <Pedido key={p._id} pedido={p} onCancelar={setCancelando} />
              ))}
            </ul>
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
        onCancel={() => setCancelando(null)}
      >
        O agente não vai mais visitar sua casa para fazer o cadastro. Você pode fazer um novo pedido depois.
      </ConfirmDialog>
    </PortalLayout>
  );
}

export default PortalConsultar;
