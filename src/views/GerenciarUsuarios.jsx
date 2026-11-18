"use client";

import React, { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, Eye, FlaskConical, Pencil, Pill, Save, ShieldCheck, Smile, Syringe, Trash2, UserPlus, UserRound, RotateCw, Users } from "lucide-react";
import api from "../services/api";
import AppLayout from "../components/AppLayout";
import { Alert, Avatar, Button, EmptyState, Field, PageHeader, PasswordInput, Section, Skeleton, TeamIcon } from "../components/ui";
import { ConfirmDialog, useToast } from "../components/feedback";
import { useDesktop } from "../hooks/dados";
import { EQUIPES, getEquipe } from "../constants/dominio";
import { CHAVES_SETORES, SETORES } from "../utils/setores";
import { useAuth } from "../auth/AuthContext";
import { REQUISITOS_SENHA, erroSenha } from "../utils/senha";

const formVazio = { nome: "", email: "", senha: "", role: "agente", equipe: "", setores: [] };

/** Tipos de conta que o supervisor pode criar. Cada setor vira uma conta "setor" com aquele setor. */
const TIPOS_CONTA = [
  { id: "agente", valor: "agente", rotulo: "Agente (ACS)", descricao: "Pacientes e visitas da própria equipe", Icone: UserRound },
  { id: "supervisor", valor: "supervisor", rotulo: "Supervisor", descricao: "Todas as equipes, usuários e configurações", Icone: ShieldCheck },
  { id: "farmacia", setor: "farmacia", rotulo: "Farmácia", descricao: "Status, movimento e remédios em falta", Icone: Pill },
  { id: "laboratorio", setor: "laboratorio", rotulo: "Laboratório (coleta)", descricao: "Status da coleta e movimento", Icone: FlaskConical },
  { id: "odontologia", setor: "odontologia", rotulo: "Odontologia", descricao: "Status, movimento e urgência do dia", Icone: Smile },
  { id: "vacinacao", setor: "vacinacao", rotulo: "Vacinação", descricao: "Status, movimento e vacinas em falta", Icone: Syringe },
  { id: "ipe", setor: "ipe", rotulo: "Atendimento IPE", descricao: "Atendimento do dia: disponível ou já realizado", Icone: BadgeCheck },
];

const nomesSetores = (lista) => (lista || []).map((c) => SETORES[c]?.rotulo || c).join(", ");

function PapelTag({ role }) {
  if (role === "supervisor") return <span className="tag tag--primary">Supervisor</span>;
  if (role === "setor") return <span className="tag">Setor</span>;
  return <span className="tag">Agente (ACS)</span>;
}

const rotuloPerfil = (role) => (role === "supervisor" ? "Supervisor" : role === "setor" ? "Conta de setor" : "Agente (ACS)");

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
  const { user: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [editandoId, setEditandoId] = useState("");
  const [usuarioVisualizado, setUsuarioVisualizado] = useState(null);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [excluindoId, setExcluindoId] = useState("");
  const formularioRef = useRef(null);
  const dialogVisualizarRef = useRef(null);

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

  useEffect(() => {
    const dialog = dialogVisualizarRef.current;
    if (!dialog) return;
    if (usuarioVisualizado && !dialog.open) dialog.showModal();
    if (!usuarioVisualizado && dialog.open) dialog.close();
  }, [usuarioVisualizado]);

  const alterar = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value, ...(name === "role" && value !== "agente" ? { equipe: "" } : {}) }));
    if (erros[name]) setErros((atual) => ({ ...atual, [name]: undefined }));
  };

  const escolherTipo = (op) => {
    setForm((f) => {
      // Numa conta nova de setor, o nome sugerido é o do setor (ex.: "Farmácia"), até a pessoa digitar outro.
      const nomeSugerido = !editandoId && (!f.nome || TIPOS_CONTA.some((t) => t.setor && t.rotulo === f.nome));
      return op.setor
        ? { ...f, role: "setor", equipe: "", setores: [op.setor], nome: nomeSugerido ? op.rotulo : f.nome }
        : { ...f, role: op.valor, setores: [], equipe: op.valor === "agente" ? f.equipe : "", nome: nomeSugerido ? "" : f.nome };
    });
    setErros((atual) => ({ ...atual, setores: undefined, equipe: undefined }));
  };

  const iniciarEdicao = (usuario) => {
    setEditandoId(usuario._id);
    setForm({ nome: usuario.nome, email: usuario.email, senha: "", role: usuario.role, equipe: usuario.equipe || "", setores: usuario.setores || [] });
    setErro("");
    setErros({});
    formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelarEdicao = () => {
    setEditandoId("");
    setForm(formVazio);
    setErro("");
    setErros({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    const novos = {};
    if (!form.nome.trim()) novos.nome = "Informe o nome completo.";
    if (!form.email.trim()) novos.email = "Informe o e-mail.";
    if (!editandoId && !form.senha) novos.senha = "Defina uma senha provisória.";
    else if (form.senha && erroSenha(form.senha)) novos.senha = erroSenha(form.senha);
    if (form.role === "agente" && !form.equipe) novos.equipe = "Selecione a equipe do agente.";
    if (form.role === "setor" && form.setores.length === 0) novos.setores = "Escolha os setores que esta conta atualiza.";
    setErros(novos);
    const primeiro = ["nome", "email", "senha", "equipe", "setores"].find((k) => novos[k]);
    if (primeiro) {
      document.getElementById(`usuario-${primeiro}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      const payload = { ...form, nome: form.nome.trim(), email: form.email.trim() };
      if (!payload.senha) delete payload.senha;
      if (editandoId) {
        await api.put(`/auth/usuarios/${editandoId}`, payload);
        toast.sucesso(`${payload.nome} foi atualizado.`);
      } else {
        await api.post("/auth/register", payload);
        toast.sucesso(`${payload.nome} foi cadastrado.`);
      }
      cancelarEdicao();
      carregarUsuarios();
    } catch (err) {
      setErro(err.message || "Não foi possível salvar o usuário.");
    } finally {
      setEnviando(false);
    }
  };

  const excluirUsuario = async () => {
    if (!usuarioParaExcluir) return;
    setExcluindoId(usuarioParaExcluir._id);
    try {
      await api.delete(`/auth/usuarios/${usuarioParaExcluir._id}`);
      toast.sucesso(`${usuarioParaExcluir.nome} foi excluído.`);
      setUsuarioParaExcluir(null);
      carregarUsuarios();
    } catch (err) {
      toast.erro(err.message || "Não foi possível excluir o usuário.");
    } finally {
      setExcluindoId("");
    }
  };

  const ehUsuarioLogado = (usuario) => String(usuario._id) === String(usuarioLogado?.id || usuarioLogado?._id);

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Configurações", to: "/config" }, { label: "Gerenciar usuários" }]}
        title="Gerenciar usuários"
        description="Agentes enxergam só a própria equipe. Supervisores enxergam todas e cadastram usuários. Contas de setor (farmácia, laboratório…) só atualizam o funcionamento da unidade e não veem dados de pacientes."
      />

      <div className="stack">
        <div ref={formularioRef} style={{ scrollMarginTop: 72 }}>
        <Section
          title={editandoId ? "Editar usuário" : "Cadastrar usuário"}
          description={editandoId ? "Atualize os dados da conta. Deixe a nova senha em branco para mantê-la." : "Informe uma senha provisória e peça para a pessoa trocá-la no primeiro acesso, em Meu perfil."}
        >
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
              <Field className="span-2" label={editandoId ? "Nova senha" : "Senha provisória"} required={!editandoId} optional={!!editandoId} htmlFor="usuario-senha" error={erros.senha} hint={REQUISITOS_SENHA.map((r) => r.texto).join(" · ")}>
                {(props) => <PasswordInput {...props} name="senha" value={form.senha} onChange={alterar} autoComplete="new-password" />}
              </Field>
              <fieldset className="fieldset field" aria-describedby="dica-papel">
                <legend className="field__label">Tipo de conta</legend>
                <p className="field__hint" id="dica-papel" style={{ marginTop: 0 }}>
                  As contas de setor (farmácia, laboratório, odontologia, vacinação e IPE) abrem direto no painel do setor e não veem dados de pacientes.
                </p>
                <div className="tipos-conta">
                  {TIPOS_CONTA.map((op) => {
                    const marcado = op.setor ? form.role === "setor" && form.setores[0] === op.setor : form.role === op.valor;
                    return (
                      <label key={op.id} className="tipo-conta" data-marcado={marcado ? "true" : undefined}>
                        <input type="radio" name="tipo-conta" value={op.id} checked={marcado} onChange={() => escolherTipo(op)} />
                        <span className="tipo-conta__icone" aria-hidden="true">
                          <op.Icone />
                        </span>
                        <span className="tipo-conta__texto">
                          <span className="tipo-conta__titulo">{op.rotulo}</span>
                          <span className="tipo-conta__descricao">{op.descricao}</span>
                        </span>
                      </label>
                    );
                  })}
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
              {form.role === "setor" && form.setores.length > 0 && (
                <fieldset className="fieldset field">
                  <legend className="field__label">
                    Esta conta também atualiza <span className="field__optional">(opcional)</span>
                  </legend>
                  <div className="choices">
                    {CHAVES_SETORES.filter((c) => c !== form.setores[0]).map((c) => (
                      <label key={c} className="choice">
                        <input
                          type="checkbox"
                          checked={form.setores.includes(c)}
                          onChange={() =>
                            setForm((f) => ({ ...f, setores: f.setores.includes(c) ? f.setores.filter((x) => x !== c) : [...f.setores, c] }))
                          }
                        />
                        <span className="choice__check" aria-hidden="true">
                          <Check strokeWidth={3} />
                        </span>
                        {SETORES[c].rotulo}
                      </label>
                    ))}
                  </div>
                  <p className="field__hint">Ex.: se o atendimento IPE é feito pela odontologia, marque "Atendimento IPE" na conta da odontologia.</p>
                </fieldset>
              )}
              {erros.setores && (
                <p className="field__error" id="erro-setores">
                  {erros.setores}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                {editandoId && <Button type="button" onClick={cancelarEdicao}>Cancelar</Button>}
                <Button type="submit" variant="primary" icon={editandoId ? Save : UserPlus} loading={enviando} loadingText="Salvando…" className="btn--block-mobile">
                  {editandoId ? "Salvar alterações" : "Cadastrar usuário"}
                </Button>
              </div>
            </div>
          </form>
        </Section>
        </div>

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
                    <th scope="col">Equipe ou setor</th>
                    <th scope="col">Ações</th>
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
                        {u.role === "setor" ? <span>{nomesSetores(u.setores)}</span> : <EquipeCelula nome={u.role === "supervisor" ? "" : u.equipe} />}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button size="sm" icon={Eye} onClick={() => setUsuarioVisualizado(u)} aria-label={`Visualizar ${u.nome}`} title={`Visualizar ${u.nome}`} />
                          {!ehUsuarioLogado(u) && (
                            <>
                            <Button size="sm" icon={Pencil} onClick={() => iniciarEdicao(u)} aria-label={`Editar ${u.nome}`} title={`Editar ${u.nome}`} />
                            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setUsuarioParaExcluir(u)} aria-label={`Excluir ${u.nome}`} title={`Excluir ${u.nome}`} />
                            </>
                          )}
                        </div>
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
                      {u.role === "agente" && u.equipe && <span className="tag">Equipe {u.equipe}</span>}
                      {u.role === "setor" && <span className="tag">{nomesSetores(u.setores)}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Button size="sm" icon={Eye} onClick={() => setUsuarioVisualizado(u)}>
                        Visualizar
                      </Button>
                      {!ehUsuarioLogado(u) && (
                        <>
                        <Button size="sm" icon={Pencil} onClick={() => iniciarEdicao(u)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="danger" icon={Trash2} onClick={() => setUsuarioParaExcluir(u)}>
                          Excluir
                        </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <dialog
        ref={dialogVisualizarRef}
        className="dialog"
        aria-labelledby="visualizar-usuario-titulo"
        onCancel={(event) => {
          event.preventDefault();
          setUsuarioVisualizado(null);
        }}
        onClick={(event) => {
          if (event.target === dialogVisualizarRef.current) setUsuarioVisualizado(null);
        }}
      >
        {usuarioVisualizado && (
          <>
            <div className="dialog__body">
              <Avatar nome={usuarioVisualizado.nome} foto={usuarioVisualizado.foto} size={48} />
              <div>
                <h2 className="dialog__title" id="visualizar-usuario-titulo">Dados do usuário</h2>
                <div className="dialog__text">
                  <p><strong>Nome:</strong> {usuarioVisualizado.nome}</p>
                  <p><strong>E-mail:</strong> {usuarioVisualizado.email}</p>
                  <p><strong>Perfil:</strong> {rotuloPerfil(usuarioVisualizado.role)}</p>
                  {usuarioVisualizado.role === "setor" ? (
                    <p><strong>Setores:</strong> {nomesSetores(usuarioVisualizado.setores)}</p>
                  ) : (
                    <p><strong>Equipe:</strong> {usuarioVisualizado.role === "supervisor" ? "Todas as equipes" : usuarioVisualizado.equipe}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="dialog__footer">
              <Button variant="primary" onClick={() => setUsuarioVisualizado(null)}>Fechar</Button>
            </div>
          </>
        )}
      </dialog>
      <ConfirmDialog
        open={!!usuarioParaExcluir}
        title="Excluir usuário?"
        confirmLabel="Excluir usuário"
        danger
        loading={!!excluindoId}
        onCancel={() => setUsuarioParaExcluir(null)}
        onConfirm={excluirUsuario}
      >
        {usuarioParaExcluir && <>O usuário <strong>{usuarioParaExcluir.nome}</strong> será removido. Essa ação não pode ser desfeita.</>}
      </ConfirmDialog>
    </AppLayout>
  );
}

export default GerenciarUsuarios;
