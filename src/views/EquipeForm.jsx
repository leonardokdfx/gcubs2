"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "../lib/router";
import { Check, CircleAlert, Trash2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { Alert, Button, ButtonLink, Field, PageHeader, Section, Skeleton, Stepper } from "../components/ui";
import { ConfirmDialog, useToast } from "../components/feedback";
import { GRUPOS_ATENCAO } from "../constants/dominio";
import { cpfValido, hojeISO, mascaraCEP, mascaraCPF, mascaraTelefone, somenteDigitos } from "../utils/formatos";

const formInicial = {
  dataHoje: "",
  responsavel: "",
  nome: "",
  cpf: "",
  telefone: "",
  cep: "",
  endereco: "",
  numero: "",
  pontoReferencia: "",
  trabalhador: "",
  enderecoMoradia: "",
  melhorHorario: "",
  moradoresHomens: 0,
  moradoresMulheres: 0,
  moradoresCriancas: 0,
  gruposAtencao: [],
  numeroSES: "",
  observacao: "",
};

const ORDEM_CAMPOS = ["dataHoje", "responsavel", "nome", "cpf", "telefone", "endereco", "numero", "trabalhador", "melhorHorario"];

// A API guarda a data em ISO (ex: 2026-08-25T00:00:00.000Z);
// o <input type="date"> só aceita o formato yyyy-mm-dd.
function paraInputDate(valor) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function formatarSeCompleto(valor, digitosEsperados, mascara) {
  const d = somenteDigitos(valor);
  return d.length >= digitosEsperados ? mascara(d) : valor || "";
}

function validar(form) {
  const e = {};
  if (!form.dataHoje) e.dataHoje = "Informe a data.";
  if (!form.responsavel) e.responsavel = "Selecione o agente responsável.";
  if (!form.nome.trim()) e.nome = "Informe o nome do paciente.";
  if (!form.cpf.trim()) e.cpf = "Informe o CPF.";
  else if (!cpfValido(form.cpf)) e.cpf = "CPF inválido. Confira os 11 dígitos.";
  if (!form.telefone.trim()) e.telefone = "Informe um telefone para contato.";
  else if (somenteDigitos(form.telefone).length < 10) e.telefone = "Telefone incompleto. Inclua o DDD.";
  if (!form.endereco.trim()) e.endereco = "Informe o endereço.";
  if (!String(form.numero).trim()) e.numero = "Informe o número (use S/N se não houver).";
  if (!form.trabalhador) e.trabalhador = "Informe se o paciente é trabalhador.";
  if (!form.melhorHorario.trim()) e.melhorHorario = "Informe o melhor horário para a visita.";
  return e;
}

function EquipeForm() {
  const { equipe, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const topo = useRef(null);

  const [form, setForm] = useState({ ...formInicial, dataHoje: id ? "" : hojeISO(), responsavel: "" });
  const [carregando, setCarregando] = useState(!!id);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState({});
  const [responsaveis, setResponsaveis] = useState([]);
  const [carregandoResponsaveis, setCarregandoResponsaveis] = useState(true);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const urlLista = `/equipe/${encodeURIComponent(equipe)}`;

  useEffect(() => {
    setCarregandoResponsaveis(true);
    api
      .get(`/auth/responsaveis/${encodeURIComponent(equipe)}`)
      .then((data) => {
        setResponsaveis(data);
        if (!id && user?.role === "agente" && data.some((r) => r.nome === user.nome)) {
          setForm((prev) => ({ ...prev, responsavel: user.nome }));
        }
      })
      .catch((err) => setErro(err.message))
      .finally(() => setCarregandoResponsaveis(false));
  }, [equipe, id, user]);

  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    api
      .get(`/pacientes/detalhe/${id}`)
      .then((data) =>
        setForm({
          ...formInicial,
          ...data,
          gruposAtencao: data.gruposAtencao || [],
          dataHoje: paraInputDate(data.dataHoje),
          cpf: formatarSeCompleto(data.cpf, 11, mascaraCPF),
          telefone: formatarSeCompleto(data.telefone, 10, mascaraTelefone),
          cep: formatarSeCompleto(data.cep, 8, mascaraCEP),
        })
      )
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false));
  }, [id]);

  const limparErro = (nome) => {
    if (erros[nome]) setErros((atual) => ({ ...atual, [nome]: undefined }));
  };

  const alterar = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    limparErro(name);
  };

  const alterarComMascara = (mascara) => (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: mascara(value) }));
    limparErro(name);
  };

  const alternarGrupo = (grupo) => {
    setForm((prev) => ({
      ...prev,
      gruposAtencao: prev.gruposAtencao.includes(grupo)
        ? prev.gruposAtencao.filter((g) => g !== grupo)
        : [...prev.gruposAtencao, grupo],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    const novos = validar(form);
    setErros(novos);
    const primeiro = ORDEM_CAMPOS.find((campo) => novos[campo]);
    if (primeiro) {
      const alvo = document.getElementById(`campo-${primeiro}`);
      alvo?.focus();
      alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setEnviando(true);
    const payload = {
      ...form,
      equipe,
      nome: form.nome.trim(),
      enderecoMoradia: form.trabalhador === "Sim" ? form.enderecoMoradia : "",
      moradoresHomens: Number(form.moradoresHomens) || 0,
      moradoresMulheres: Number(form.moradoresMulheres) || 0,
      moradoresCriancas: Number(form.moradoresCriancas) || 0,
    };

    try {
      if (id) {
        await api.put(`/pacientes/${id}`, payload);
        toast.sucesso("Alterações salvas.");
      } else {
        await api.post(`/pacientes`, payload);
        toast.sucesso(`${payload.nome} cadastrado na equipe ${equipe}.`);
      }
      navigate(urlLista);
    } catch (err) {
      setErro(err.message || "Não foi possível salvar o paciente.");
      topo.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async () => {
    setExcluindo(true);
    try {
      await api.delete(`/pacientes/${id}`);
      toast.sucesso(`Cadastro de ${form.nome} excluído.`);
      navigate(urlLista);
    } catch (err) {
      toast.erro(err.message || "Não foi possível excluir o paciente.");
      setExcluindo(false);
      setConfirmarExclusao(false);
    }
  };

  const titulo = id ? "Editar paciente" : "Cadastrar paciente";
  const qtdErros = Object.values(erros).filter(Boolean).length;

  return (
    <AppLayout semNavInferior estreito>
      <div ref={topo} style={{ scrollMarginTop: 72 }}>
        <PageHeader
          breadcrumb={[
            { label: "Início", to: "/dashboard" },
            { label: `Equipe ${equipe}`, to: urlLista },
            { label: titulo },
          ]}
          title={titulo}
          description={`Equipe ${equipe}. Campos com * são obrigatórios.`}
        />
      </div>

      {carregando ? (
        <div className="stack" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="paper" style={{ padding: 20, display: "grid", gap: 14 }}>
              <Skeleton width="30%" height={16} />
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="stack">
            {erro && <Alert type="danger" title="Não foi possível salvar">{erro}</Alert>}
            {qtdErros > 0 && (
              <Alert type="danger">
                {qtdErros === 1 ? "Um campo precisa de atenção." : `${qtdErros} campos precisam de atenção.`} Confira as mensagens abaixo.
              </Alert>
            )}

            <Section title="Registro">
              <div className="form-grid">
                <Field className="span-3" label="Data do registro" required htmlFor="campo-dataHoje" error={erros.dataHoje}>
                  {(props) => <input {...props} type="date" name="dataHoje" value={form.dataHoje} onChange={alterar} className="input" />}
                </Field>
                <Field
                  className="span-3"
                  label="Agente responsável"
                  required
                  htmlFor="campo-responsavel"
                  error={erros.responsavel}
                  hint={!carregandoResponsaveis && responsaveis.length === 0 ? "Nenhum agente cadastrado nesta equipe." : undefined}
                >
                  {(props) => (
                    <select {...props} name="responsavel" value={form.responsavel} onChange={alterar} className="select" disabled={carregandoResponsaveis}>
                      <option value="">{carregandoResponsaveis ? "Carregando agentes…" : "Selecione o agente"}</option>
                      {responsaveis.map((r) => (
                        <option key={r._id} value={r.nome}>
                          {r.nome}
                        </option>
                      ))}
                      {form.responsavel && !responsaveis.some((r) => r.nome === form.responsavel) && (
                        <option value={form.responsavel}>{form.responsavel}</option>
                      )}
                    </select>
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Identificação do paciente">
              <div className="form-grid">
                <Field label="Nome completo" required htmlFor="campo-nome" error={erros.nome}>
                  {(props) => (
                    <input {...props} name="nome" value={form.nome} onChange={alterar} className="input" autoComplete="off" autoCapitalize="words" />
                  )}
                </Field>
                <Field className="span-3" label="CPF" required htmlFor="campo-cpf" error={erros.cpf}>
                  {(props) => (
                    <input
                      {...props}
                      name="cpf"
                      value={form.cpf}
                      onChange={alterarComMascara(mascaraCPF)}
                      className="input num"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field className="span-3" label="Telefone" required htmlFor="campo-telefone" error={erros.telefone}>
                  {(props) => (
                    <input
                      {...props}
                      name="telefone"
                      type="tel"
                      value={form.telefone}
                      onChange={alterarComMascara(mascaraTelefone)}
                      className="input num"
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      autoComplete="off"
                    />
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Endereço">
              <div className="form-grid">
                <Field className="span-2" label="CEP" optional htmlFor="campo-cep">
                  {(props) => (
                    <input
                      {...props}
                      name="cep"
                      value={form.cep}
                      onChange={alterarComMascara(mascaraCEP)}
                      className="input num"
                      inputMode="numeric"
                      placeholder="00000-000"
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field className="span-4" label="Endereço" required htmlFor="campo-endereco" error={erros.endereco} hint="Rua, avenida, travessa…">
                  {(props) => <input {...props} name="endereco" value={form.endereco} onChange={alterar} className="input" autoComplete="off" />}
                </Field>
                <Field className="span-2" label="Número" required htmlFor="campo-numero" error={erros.numero}>
                  {(props) => <input {...props} name="numero" value={form.numero} onChange={alterar} className="input" autoComplete="off" />}
                </Field>
                <Field className="span-4" label="Ponto de referência" optional htmlFor="campo-pontoReferencia">
                  {(props) => (
                    <input
                      {...props}
                      name="pontoReferencia"
                      value={form.pontoReferencia}
                      onChange={alterar}
                      className="input"
                      placeholder="Ex.: ao lado da padaria"
                      autoComplete="off"
                    />
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Trabalho e disponibilidade">
              <div className="form-grid">
                <fieldset className="fieldset field" aria-describedby={erros.trabalhador ? "erro-trabalhador" : undefined}>
                  <legend className="field__label">
                    O paciente é trabalhador?
                    <span className="field__required" aria-hidden="true">
                      *
                    </span>
                  </legend>
                  <div className="choices" aria-invalid={erros.trabalhador ? true : undefined}>
                    {["Sim", "Não"].map((opcao, i) => (
                      <label key={opcao} className="choice choice--radio">
                        <input
                          type="radio"
                          name="trabalhador"
                          value={opcao}
                          checked={form.trabalhador === opcao}
                          onChange={alterar}
                          id={i === 0 ? "campo-trabalhador" : undefined}
                        />
                        <span className="choice__check" aria-hidden="true" />
                        {opcao}
                      </label>
                    ))}
                  </div>
                  {erros.trabalhador && (
                    <p className="field__error" id="erro-trabalhador">
                      <CircleAlert aria-hidden="true" />
                      {erros.trabalhador}
                    </p>
                  )}
                </fieldset>

                {form.trabalhador === "Sim" && (
                  <Field label="Endereço de moradia" optional htmlFor="campo-enderecoMoradia" hint="Onde o paciente mora, se for diferente do endereço acima.">
                    {(props) => (
                      <input {...props} name="enderecoMoradia" value={form.enderecoMoradia} onChange={alterar} className="input" autoComplete="off" />
                    )}
                  </Field>
                )}

                <Field label="Melhor horário para visita" required htmlFor="campo-melhorHorario" error={erros.melhorHorario}>
                  {(props) => (
                    <input
                      {...props}
                      name="melhorHorario"
                      value={form.melhorHorario}
                      onChange={alterar}
                      className="input"
                      placeholder="Ex.: tardes, de segunda a sexta"
                      autoComplete="off"
                    />
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Moradores do domicílio">
              <div className="form-grid">
                {[
                  { nome: "moradoresHomens", rotulo: "Homens" },
                  { nome: "moradoresMulheres", rotulo: "Mulheres" },
                  { nome: "moradoresCriancas", rotulo: "Crianças" },
                ].map((campo) => (
                  <Field key={campo.nome} className="span-2 field--inline" label={campo.rotulo} htmlFor={`campo-${campo.nome}`}>
                    {(props) => (
                      <Stepper
                        id={props.id}
                        name={campo.nome}
                        value={form[campo.nome]}
                        onChange={alterar}
                        label={campo.rotulo.toLowerCase()}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </Section>

            <Section title="Saúde">
              <div className="form-grid">
                <fieldset className="fieldset field">
                  <legend className="field__label">
                    Grupos de atenção <span className="field__optional">(marque todos que se aplicam)</span>
                  </legend>
                  <div className="choices">
                    {GRUPOS_ATENCAO.map((grupo) => (
                      <label key={grupo} className="choice">
                        <input
                          type="checkbox"
                          name="gruposAtencao"
                          value={grupo}
                          checked={form.gruposAtencao.includes(grupo)}
                          onChange={() => alternarGrupo(grupo)}
                        />
                        <span className="choice__check" aria-hidden="true">
                          <Check strokeWidth={3} />
                        </span>
                        {grupo}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field className="span-3" label="Número do SES" optional htmlFor="campo-numeroSES">
                  {(props) => <input {...props} name="numeroSES" value={form.numeroSES} onChange={alterar} className="input" autoComplete="off" />}
                </Field>
                <Field label="Observação" optional htmlFor="campo-observacao">
                  {(props) => <textarea {...props} name="observacao" value={form.observacao} onChange={alterar} className="textarea" rows={3} />}
                </Field>
              </div>
            </Section>

            {id && (
              <Section title="Excluir cadastro">
                <div className="danger-zone">
                  <p className="danger-zone__text">Remove o paciente da equipe {equipe}. Essa ação não pode ser desfeita.</p>
                  <Button variant="ghost" className="btn--danger-text" icon={Trash2} onClick={() => setConfirmarExclusao(true)}>
                    Excluir paciente
                  </Button>
                </div>
              </Section>
            )}
          </div>

          <div className="action-bar">
            <ButtonLink to={urlLista}>Cancelar</ButtonLink>
            <Button type="submit" variant="primary" loading={enviando} loadingText="Salvando…">
              {id ? "Salvar alterações" : "Cadastrar paciente"}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmarExclusao}
        danger
        title="Excluir paciente?"
        confirmLabel="Excluir paciente"
        loading={excluindo}
        onConfirm={excluir}
        onCancel={() => setConfirmarExclusao(false)}
      >
        O cadastro de <strong>{form.nome}</strong> será excluído permanentemente da equipe {equipe}. Essa ação não pode ser desfeita.
      </ConfirmDialog>
    </AppLayout>
  );
}

export default EquipeForm;
