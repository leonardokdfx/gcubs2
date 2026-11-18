"use client";

import React, { useState } from "react";
import { CalendarCheck, CalendarX2, CircleAlert, Clock, MessageSquare, Stethoscope } from "lucide-react";
import api from "../../services/api";
import PortalLayout from "../../components/PortalLayout";
import { Alert, Button, EmptyState, Field, PageHeader, Section } from "../../components/ui";
import { ConfirmDialog, useToast } from "../../components/feedback";
import { cpfValido, mascaraCPF } from "../../utils/formatos";
import { erroNascimento, exibirData, hojeNoFuso } from "../../utils/agendamento";
import {
  MOTIVOS_FALTA,
  PROFISSIONAIS_CONSULTA,
  RESPOSTAS_CONSULTA,
  limitesConsulta,
  quandoConsulta,
  validarAviso,
} from "../../utils/avisosConsulta";
import { UNIDADE } from "../../constants/unidade";

const FORM_VAZIO = { dataConsulta: "", horario: "", profissional: "", resposta: "", motivo: "", observacao: "" };

/** Grupo de botões de rádio com legenda e erro, no padrão do formulário de cadastro. */
function Opcoes({ rotulo, nome, opcoes, valor, onChange, erro }) {
  const idErro = `erro-${nome}`;
  return (
    <fieldset className="fieldset field" style={{ gridColumn: "1 / -1" }} aria-describedby={erro ? idErro : undefined}>
      <legend className="field__label">
        {rotulo}
        <span className="field__required" aria-hidden="true">
          *
        </span>
      </legend>
      <div className="choices" aria-invalid={erro ? true : undefined}>
        {Object.entries(opcoes).map(([chave, texto], i) => (
          <label key={chave} className="choice choice--radio">
            <input type="radio" name={nome} value={chave} checked={valor === chave} onChange={() => onChange(chave)} id={i === 0 ? `campo-${nome}` : undefined} />
            <span className="choice__check" aria-hidden="true" />
            {texto}
          </label>
        ))}
      </div>
      {erro && (
        <p className="field__error" id={idErro}>
          <CircleAlert aria-hidden="true" />
          {erro}
        </p>
      )}
    </fieldset>
  );
}

/** O que acontece agora com o aviso, em palavras do paciente. */
function situacaoDoAviso(a) {
  if (a.resposta === "nao_vou") {
    return a.repasse === "feito"
      ? "A equipe já foi avisada e a vaga vai para outro paciente. Para marcar outra consulta, procure a UBS."
      : "Aviso recebido. Seu ACS vai passar para a equipe.";
  }
  if (a.repasse === "pendente") return "Você mudou de ideia. Seu ACS vai avisar a equipe que você vai à consulta.";
  if (a.repasse === "feito") {
    return "A equipe foi avisada de que você vai. Como a vaga pode já ter ido para outra pessoa, confirme com a UBS antes de ir.";
  }
  return "Combinado! Chegue com antecedência e leve um documento com foto e o Cartão SUS.";
}

function Aviso({ aviso, onTrocar }) {
  const naoVou = aviso.resposta === "nao_vou";
  return (
    <li className="list-item">
      <div className="list-item__main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="list-item__title">{quandoConsulta(aviso, exibirData)}</span>
          <span className="tag" data-status={naoVou ? "ausente" : "realizada"}>
            {naoVou ? <CalendarX2 aria-hidden="true" /> : <CalendarCheck aria-hidden="true" />}
            {naoVou ? "Não vou" : "Vou"}
          </span>
        </div>
        <div className="list-item__meta">
          <span className="list-item__meta-row">
            <Stethoscope aria-hidden="true" />
            <span>{PROFISSIONAIS_CONSULTA[aviso.profissional]}</span>
          </span>
          {naoVou && aviso.motivo && (
            <span className="list-item__meta-row">
              <MessageSquare aria-hidden="true" />
              <span>
                {MOTIVOS_FALTA[aviso.motivo]}
                {aviso.observacao && `: “${aviso.observacao}”`}
              </span>
            </span>
          )}
          <span className="list-item__meta-row">
            <Clock aria-hidden="true" />
            <span>{situacaoDoAviso(aviso)}</span>
          </span>
        </div>
        <div className="list-item__actions">
          <Button size="sm" variant="ghost" className={naoVou ? "btn--primary-text" : "btn--danger-text"} onClick={() => onTrocar(aviso)}>
            {naoVou ? "Mudei de ideia: vou à consulta" : "Não vou mais"}
          </Button>
        </div>
      </div>
    </li>
  );
}

function PortalAvisoConsulta() {
  const toast = useToast();
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [errosBusca, setErrosBusca] = useState({});
  const [erroBusca, setErroBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [dados, setDados] = useState(null); // { paciente, avisos }

  const [form, setForm] = useState(FORM_VAZIO);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [retorno, setRetorno] = useState(null); // mensagem de sucesso do último envio
  const [trocando, setTrocando] = useState(null);

  const limites = limitesConsulta();
  const campo = (nome) => (valor) => setForm((f) => ({ ...f, [nome]: valor }));

  const buscar = async (e) => {
    e?.preventDefault();
    setErroBusca("");
    const novos = {};
    if (!cpfValido(cpf)) novos.cpf = cpf ? "CPF inválido. Confira os 11 dígitos." : "Informe seu CPF.";
    const msg = erroNascimento(nascimento);
    if (msg) novos.dataNascimento = msg;
    setErrosBusca(novos);
    if (Object.keys(novos).length > 0) {
      document.getElementById(novos.cpf ? "aviso-cpf" : "aviso-nascimento")?.focus();
      return;
    }
    setBuscando(true);
    try {
      setDados(await api.post("/portal/avisos", { cpf, dataNascimento: nascimento }, { auth: false }));
      setRetorno(null);
    } catch (err) {
      setDados(null);
      setErroBusca(err.message);
    } finally {
      setBuscando(false);
    }
  };

  const enviar = async (corpo) => {
    const r = await api.post("/portal/avisos/responder", { cpf, dataNascimento: nascimento, ...corpo }, { auth: false });
    setDados((d) => ({ ...d, avisos: r.avisos }));
    return r;
  };

  const avisar = async (e) => {
    e.preventDefault();
    const novos = validarAviso(form);
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      const primeiro = Object.keys(novos)[0];
      document.getElementById(["profissional", "resposta"].includes(primeiro) ? `campo-${primeiro}` : `aviso-${primeiro}`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      const r = await enviar(form);
      setRetorno({ tipo: form.resposta, texto: r.message });
      setForm(FORM_VAZIO);
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const trocar = async () => {
    const a = trocando;
    setEnviando(true);
    try {
      const r = await enviar({
        dataConsulta: a.dataConsulta.slice(0, 10),
        horario: a.horario || "",
        profissional: a.profissional,
        resposta: a.resposta === "nao_vou" ? "vou" : "nao_vou",
      });
      toast.sucesso(r.message);
      setTrocando(null);
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const voltandoAtras = trocando?.resposta === "nao_vou" && trocando?.repasse === "feito";

  return (
    <PortalLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/paciente" }, { label: "Minha consulta" }]}
        title="Vou à minha consulta?"
        description="Já tem consulta marcada na UBS? Avise se vai ou não. Se não puder ir, a vaga fica para outro paciente que está esperando."
      />

      <div className="stack">
        <form onSubmit={buscar} noValidate>
          <Section title="Quem é você" description="Use o CPF e a data de nascimento do paciente que tem a consulta.">
            <div className="form-grid">
              <Field className="span-3" label="CPF" htmlFor="aviso-cpf" error={errosBusca.cpf}>
                {(props) => (
                  <input
                    {...props}
                    className="input num"
                    value={cpf}
                    onChange={(e) => {
                      setCpf(mascaraCPF(e.target.value));
                      setDados(null);
                    }}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    autoComplete="off"
                  />
                )}
              </Field>
              <Field className="span-3" label="Data de nascimento" htmlFor="aviso-nascimento" error={errosBusca.dataNascimento}>
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    className="input"
                    max={hojeNoFuso()}
                    value={nascimento}
                    onChange={(e) => {
                      setNascimento(e.target.value);
                      setDados(null);
                    }}
                    suppressHydrationWarning
                  />
                )}
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button type="submit" variant="primary" loading={buscando} loadingText="Buscando…">
                Continuar
              </Button>
            </div>
          </Section>
        </form>

        {erroBusca && <Alert type="warning">{erroBusca}</Alert>}

        {dados && (
          <>
            <Alert type="info" title={`Olá, ${dados.paciente.nome}!`}>
              Equipe {dados.paciente.equipe}
              {dados.paciente.acs && `, agente comunitário de saúde ${dados.paciente.acs}`}. Seu aviso chega para o ACS, que passa para a equipe.
            </Alert>

            {retorno && (
              <Alert type="success" title={retorno.tipo === "nao_vou" ? "Obrigado por avisar" : "Presença confirmada"}>
                {retorno.texto}
              </Alert>
            )}

            <form onSubmit={avisar} noValidate>
              <Section title="Avisar sobre uma consulta" description="Preencha com os dados que estão no seu comprovante ou que a UBS passou.">
                <div className="form-grid">
                  <Field className="span-3" label="Dia da consulta" required htmlFor="aviso-dataConsulta" error={erros.dataConsulta}>
                    {(props) => (
                      <input
                        {...props}
                        type="date"
                        className="input"
                        min={limites.min}
                        max={limites.max}
                        value={form.dataConsulta}
                        onChange={(e) => campo("dataConsulta")(e.target.value)}
                        suppressHydrationWarning
                      />
                    )}
                  </Field>
                  <Field className="span-3" label="Horário" optional htmlFor="aviso-horario" error={erros.horario}>
                    {(props) => <input {...props} type="time" className="input" value={form.horario} onChange={(e) => campo("horario")(e.target.value)} />}
                  </Field>
                  <Opcoes
                    rotulo="Com quem é a consulta?"
                    nome="profissional"
                    opcoes={PROFISSIONAIS_CONSULTA}
                    valor={form.profissional}
                    onChange={campo("profissional")}
                    erro={erros.profissional}
                  />
                  <Opcoes
                    rotulo="Você vai à consulta?"
                    nome="resposta"
                    opcoes={RESPOSTAS_CONSULTA}
                    valor={form.resposta}
                    onChange={campo("resposta")}
                    erro={erros.resposta}
                  />
                  {form.resposta === "nao_vou" && (
                    <>
                      <Field className="span-3" label="Por que não vai?" optional htmlFor="aviso-motivo" hint="Ajuda a unidade a melhorar o atendimento.">
                        {(props) => (
                          <select {...props} className="select" value={form.motivo} onChange={(e) => campo("motivo")(e.target.value)}>
                            <option value="">Prefiro não dizer</option>
                            {Object.entries(MOTIVOS_FALTA).map(([chave, texto]) => (
                              <option key={chave} value={chave}>
                                {texto}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                      <Field className="span-3" label="Recado para a equipe" optional htmlFor="aviso-observacao" hint="Ex.: Quero remarcar para a semana que vem.">
                        {(props) => (
                          <input {...props} className="input" maxLength={200} value={form.observacao} onChange={(e) => campo("observacao")(e.target.value)} />
                        )}
                      </Field>
                    </>
                  )}
                </div>
                {form.resposta === "nao_vou" && (
                  <p className="field__hint" style={{ marginTop: "var(--space-3)" }}>
                    Avisando que não vai, sua vaga é passada para outro paciente. Para marcar de novo, procure a {UNIDADE.nome} ou seu ACS.
                  </p>
                )}
                <div style={{ marginTop: 16 }}>
                  <Button type="submit" variant="primary" loading={enviando && !trocando} loadingText="Enviando…">
                    Enviar aviso
                  </Button>
                </div>
              </Section>
            </form>

            <Section title="Consultas que você já avisou" description="De hoje em diante. Você pode trocar a resposta se mudar de ideia.">
              {dados.avisos.length === 0 ? (
                <EmptyState icon={CalendarCheck} title="Nenhum aviso ainda">
                  Quando você avisar sobre uma consulta, ela aparece aqui.
                </EmptyState>
              ) : (
                <ul className="list" aria-label="Consultas avisadas">
                  {dados.avisos.map((a) => (
                    <Aviso key={a._id} aviso={a} onTrocar={setTrocando} />
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!trocando}
        danger={trocando?.resposta === "vou"}
        title={trocando?.resposta === "nao_vou" ? "Vai à consulta, afinal?" : "Não vai mais à consulta?"}
        confirmLabel={trocando?.resposta === "nao_vou" ? "Sim, vou à consulta" : "Não vou"}
        cancelLabel="Voltar"
        loading={enviando}
        onConfirm={trocar}
        onCancel={() => setTrocando(null)}
      >
        {trocando &&
          (trocando.resposta === "vou"
            ? `Sua vaga de ${quandoConsulta(trocando, exibirData)} será passada para outro paciente.`
            : voltandoAtras
              ? "A equipe já foi avisada de que você não ia, e a vaga pode ter sido passada para outro paciente. Seu ACS vai avisar que você mudou de ideia, mas confirme com a UBS antes de ir."
              : "Seu ACS ainda não repassou o aviso. A consulta continua marcada para você.")}
      </ConfirmDialog>
    </PortalLayout>
  );
}

export default PortalAvisoConsulta;
