"use client";

import React, { useEffect, useState } from "react";
import { UserPlus, RotateCw, Users } from "lucide-react";
import api from "../services/api";
import AppLayout from "../components/AppLayout";
import { Alert, Avatar, Button, EmptyState, Field, PageHeader, PasswordInput, Section, Skeleton, TeamIcon } from "../components/ui";
import { useToast } from "../components/feedback";
import { useDesktop } from "../hooks/dados";
import { EQUIPES, getEquipe } from "../constants/dominio";

const formVazio = { nome: "", email: "", senha: "", role: "agente", equipe: "" };

function PapelTag({ role }) {
  return role === "supervisor" ? <span className="tag tag--primary">Supervisor</span> : <span className="tag">Agente (ACS)</span>;
}

function EquipeCelula({ nome }) {
  if (!nome) return <span style={{ color: "var(--color-text-secondary)" }}>Todas as equipes</span>;
  return (
    <span className="team-cell">
      <TeamIcon equipe={getEquipe(nome)} size={28} />
      Equipe {nome}
    </span>
  );
}

function GerenciarUsuarios() {
  const toast = useToast();
  const desktop = useDesktop();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState(formVazio);

  const carregarUsuarios = () => {
    setCarregando(true);
    setErroLista("");
    api
      .get("/auth/usuarios")
      .then(setUsuarios)
      .catch((err) => setErroLista(err.message))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const alterar = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value, ...(name === "role" && value === "supervisor" ? { equipe: "" } : {}) }));
    if (erros[name]) setErros((atual) => ({ ...atual, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    const novos = {};
    if (!form.nome.trim()) novos.nome = "Informe o nome completo.";
    if (!form.email.trim()) novos.email = "Informe o e-mail.";
    if (!form.senha) novos.senha = "Defina uma senha provisória.";
    if (form.role === "agente" && !form.equipe) novos.equipe = "Selecione a equipe do agente.";
    setErros(novos);
    const primeiro = ["nome", "email", "senha", "equipe"].find((k) => novos[k]);
    if (primeiro) {
      document.getElementById(`usuario-${primeiro}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      await api.post("/auth/register", { ...form, nome: form.nome.trim(), email: form.email.trim() });
      toast.sucesso(`${form.nome.trim()} foi cadastrado.`);
      setForm(formVazio);
      carregarUsuarios();
    } catch (err) {
      setErro(err.message || "Não foi possível cadastrar o usuário.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Configurações", to: "/config" }, { label: "Gerenciar usuários" }]}
        title="Gerenciar usuários"
        description="Agentes enxergam só a própria equipe. Supervisores enxergam todas e cadastram usuários."
      />

      <div className="stack">
        <Section title="Cadastrar usuário" description="Informe uma senha provisória e peça para a pessoa trocá-la no primeiro acesso, em Meu perfil.">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              {erro && (
                <div>
                  <Alert type="danger">{erro}</Alert>
                </div>
              )}
              <Field className="span-3" label="Nome completo" required htmlFor="usuario-nome" error={erros.nome}>
                {(props) => <input {...props} name="nome" value={form.nome} onChange={alterar} className="input" autoComplete="off" />}
              </Field>
              <Field className="span-3" label="E-mail" required htmlFor="usuario-email" error={erros.email}>
                {(props) => (
                  <input
                    {...props}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={alterar}
                    className="input"
                    autoComplete="off"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                )}
              </Field>
              <Field className="span-2" label="Senha provisória" required htmlFor="usuario-senha" error={erros.senha}>
                {(props) => <PasswordInput {...props} name="senha" value={form.senha} onChange={alterar} autoComplete="new-password" />}
              </Field>
              <fieldset className="fieldset field span-2">
                <legend className="field__label">Papel</legend>
                <div className="choices">
                  {[
                    { valor: "agente", rotulo: "Agente" },
                    { valor: "supervisor", rotulo: "Supervisor" },
                  ].map((op) => (
                    <label key={op.valor} className="choice choice--radio" style={{ flex: 1 }}>
                      <input type="radio" name="role" value={op.valor} checked={form.role === op.valor} onChange={alterar} />
                      <span className="choice__check" aria-hidden="true" />
                      {op.rotulo}
                    </label>
                  ))}
                </div>
              </fieldset>
              {form.role === "agente" && (
                <Field className="span-2" label="Equipe" required htmlFor="usuario-equipe" error={erros.equipe}>
                  {(props) => (
                    <select {...props} name="equipe" value={form.equipe} onChange={alterar} className="select">
                      <option value="">Selecione a equipe</option>
                      {EQUIPES.map((eq) => (
                        <option key={eq.nome} value={eq.nome}>
                          Equipe {eq.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit" variant="primary" icon={UserPlus} loading={enviando} loadingText="Cadastrando…" className="btn--block-mobile">
                  Cadastrar usuário
                </Button>
              </div>
            </div>
          </form>
        </Section>

        <Section
          title="Usuários cadastrados"
          description={!carregando && !erroLista ? `${usuarios.length} ${usuarios.length === 1 ? "usuário" : "usuários"}` : undefined}
          bodyClassName="section__body--flush"
        >
          {erroLista ? (
            <div style={{ padding: "var(--space-4)" }}>
              <Alert
                type="danger"
                action={
                  <Button size="sm" icon={RotateCw} onClick={carregarUsuarios}>
                    Tentar de novo
                  </Button>
                }
              >
                {erroLista}
              </Alert>
            </div>
          ) : carregando ? (
            <div style={{ padding: "var(--space-4)", display: "grid", gap: 12 }} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={40} />
              ))}
            </div>
          ) : usuarios.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum usuário cadastrado" />
          ) : desktop ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Papel</th>
                    <th scope="col">Equipe</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <span className="team-cell">
                          <Avatar nome={u.nome} foto={u.foto} size={32} />
                          <span className="cell-primary">{u.nome}</span>
                        </span>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <PapelTag role={u.role} />
                      </td>
                      <td>
                        <EquipeCelula nome={u.role === "supervisor" ? "" : u.equipe} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="list">
              {usuarios.map((u) => (
                <li key={u._id} className="list-item" style={{ alignItems: "center" }}>
                  <Avatar nome={u.nome} foto={u.foto} size={40} />
                  <div className="list-item__main">
                    <p className="list-item__title" style={{ fontSize: "var(--text-base)" }}>
                      {u.nome}
                    </p>
                    <p className="cell-secondary" style={{ overflowWrap: "anywhere" }}>
                      {u.email}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" }}>
                      <PapelTag role={u.role} />
                      {u.role !== "supervisor" && u.equipe && <span className="tag">Equipe {u.equipe}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </AppLayout>
  );
}

export default GerenciarUsuarios;
