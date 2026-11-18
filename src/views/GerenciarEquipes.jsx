"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, MapPinned, Pencil, Plus, RotateCw, Save, Trash2, Users, UsersRound } from "lucide-react";
import api from "../services/api";
import { useSearchParams } from "../lib/router";
import AppLayout from "../components/AppLayout";
import { Alert, Button, ButtonLink, EmptyState, Field, PageHeader, Section, Skeleton, TeamIcon } from "../components/ui";
import { FormDialog, useToast } from "../components/feedback";
import { useEquipes } from "../auth/EquipesContext";
import { ICONES_EQUIPE_COMPONENTES } from "../constants/dominio";
import { ICONES_EQUIPE, chaveEquipe } from "../utils/equipes";
import { plural, rotuloMicroarea } from "../utils/formatos";

const formVazio = { nome: "", icone: "vento" };
const comIcone = (e) => ({ ...e, Icone: ICONES_EQUIPE_COMPONENTES[e.icone] || ICONES_EQUIPE_COMPONENTES.vento });
const totalVinculos = (v) => (v ? v.pacientes + v.agentes + v.microareas + v.pedidos : 0);

function Contagens({ v }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <span className="tag">{plural(v.pacientes, "paciente", "pacientes")}</span>
      <span className="tag">{plural(v.agentes, "ACS", "ACS")}</span>
      <span className="tag">{plural(v.microareas, "microárea", "microáreas")}</span>
      {v.pedidos > 0 && <span className="tag tag--primary">{plural(v.pedidos, "pedido em andamento", "pedidos em andamento")}</span>}
    </div>
  );
}

/** Escolha do ícone da equipe. */
function SeletorIcone({ valor, onChange }) {
  return (
    <fieldset className="fieldset field">
      <legend className="field__label">Ícone</legend>
      <div className="icones-equipe">
        {Object.entries(ICONES_EQUIPE).map(([chave, rotulo]) => {
          const Icone = ICONES_EQUIPE_COMPONENTES[chave];
          return (
            <label key={chave} className="icone-equipe" data-marcado={valor === chave ? "true" : undefined} title={rotulo}>
              <input type="radio" name="icone-equipe" value={chave} checked={valor === chave} onChange={() => onChange(chave)} />
              <Icone aria-hidden="true" />
              <span className="sr-only">{rotulo}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Detalhes da equipe: ACS e microáreas. */
function VisualizarEquipe({ equipe, onFechar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([api.get("/auth/usuarios"), api.get("/territorio")])
      .then(([usuarios, microareas]) => {
        const daEquipe = (e) => chaveEquipe(e) === chaveEquipe(equipe.nome);
        setDados({
          agentes: usuarios.filter((u) => u.role === "agente" && daEquipe(u.equipe)).sort((a, b) => a.nome.localeCompare(b.nome)),
          microareas: microareas.filter((m) => daEquipe(m.equipe)),
        });
      })
      .catch((err) => setErro(err.message));
  }, [equipe.nome]);

  return (
    <FormDialog open title={`Equipe ${equipe.nome}`} submitLabel="Fechar" onSubmit={onFechar} onCancel={onFechar} wide>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TeamIcon equipe={equipe} size={44} />
        <Contagens v={equipe.vinculos} />
      </div>
      {erro && <Alert type="danger">{erro}</Alert>}
      {!dados && !erro && <Skeleton height={80} />}
      {dados && (
        <>
          <div>
            <p className="field__label" style={{ marginBottom: 6 }}>
              Agentes comunitários (ACS)
            </p>
            {dados.agentes.length === 0 ? (
              <p className="field__hint" style={{ margin: 0 }}>
                Nenhum ACS nesta equipe. Cadastre em Gerenciar usuários.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {dados.agentes.map((a) => (
                  <li key={a._id}>
                    {a.nome} <span className="field__hint">· {a.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="field__label" style={{ marginBottom: 6 }}>
              Microáreas
            </p>
            {dados.microareas.length === 0 ? (
              <p className="field__hint" style={{ margin: 0 }}>
                Nenhuma microárea. Cadastre em Configurações › Território.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {dados.microareas.map((m) => (
                  <li key={m._id}>
                    {rotuloMicroarea(m.numero)} · {m.agente?.nome ? `ACS ${m.agente.nome}` : "sem ACS"} · {plural(m.ceps?.length || 0, "CEP", "CEPs")}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <ButtonLink to={`/equipe/${encodeURIComponent(equipe.nome)}`} size="sm" icon={Users}>
              Ver pacientes
            </ButtonLink>
            <ButtonLink to="/config/territorio" size="sm" icon={MapPinned}>
              Território
            </ButtonLink>
          </div>
        </>
      )}
    </FormDialog>
  );
}

/** Excluir equipe: sem cadastros, só confirma; com cadastros, escolhe a equipe que recebe tudo. */
function ExcluirEquipe({ equipe, outras, onFechar, onExcluida }) {
  const toast = useToast();
  const [destino, setDestino] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const v = equipe.vinculos;
  const precisaMover = totalVinculos(v) > 0;

  const excluir = async () => {
    if (precisaMover && !destino) return setErro("Escolha a equipe que vai receber os cadastros.");
    setSalvando(true);
    try {
      const r = await api.delete(`/equipes/${equipe._id}${precisaMover ? `?moverPara=${encodeURIComponent(destino)}` : ""}`);
      toast.sucesso(r.message);
      onExcluida();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <FormDialog
      open
      danger
      title={`Excluir a equipe ${equipe.nome}?`}
      description={
        precisaMover
          ? "Esta equipe tem cadastros. Eles não são apagados: vão todos para a equipe que você escolher."
          : "A equipe não tem pacientes, ACS, microáreas nem pedidos. Ela será removida da lista."
      }
      submitLabel={precisaMover ? "Mover cadastros e excluir" : "Excluir equipe"}
      loading={salvando}
      onSubmit={excluir}
      onCancel={onFechar}
    >
      {erro && <Alert type="danger">{erro}</Alert>}
      {precisaMover && (
        <>
          <Contagens v={v} />
          <Field label="Mover tudo para a equipe" required htmlFor="excluir-destino">
            {(props) => (
              <select
                {...props}
                className="select"
                value={destino}
                onChange={(e) => {
                  setDestino(e.target.value);
                  setErro("");
                }}
              >
                <option value="">Selecione a equipe</option>
                {outras.map((o) => (
                  <option key={o._id} value={o.nome}>
                    Equipe {o.nome}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {destino && (
            <p className="field__hint" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              {equipe.nome} <ArrowRight aria-hidden="true" style={{ width: 14, height: 14 }} /> {destino}: pacientes, ACS, microáreas, pedidos do portal e avisos de
              consulta. A presença do médico e do enfermeiro da equipe {equipe.nome} é apagada.
            </p>
          )}
          <Alert type="warning">
            Se as duas equipes têm microáreas com o mesmo número, renumere antes em Configurações › Território. Esta ação não pode ser desfeita.
          </Alert>
        </>
      )}
    </FormDialog>
  );
}

function GerenciarEquipes() {
  const toast = useToast();
  const { recarregar: recarregarEquipesDoApp } = useEquipes();
  const [equipes, setEquipes] = useState(null);
  const [erroLista, setErroLista] = useState("");
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [vendo, setVendo] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const formularioRef = useRef(null);
  const [params, setParams] = useSearchParams();

  const carregar = useCallback(() => {
    api
      .get("/equipes?detalhes=1")
      .then((lista) => {
        setEquipes(lista.map(comIcone));
        setErroLista("");
      })
      .catch((err) => setErroLista(err.message));
  }, []);

  useEffect(carregar, [carregar]);

  const depoisDeMudar = () => {
    carregar();
    recarregarEquipesDoApp(); // menu, filtros e formulários do sistema passam a ver a mudança
  };

  const iniciarEdicao = (e) => {
    setEditando(e);
    setForm({ nome: e.nome, icone: e.icone || "vento" });
    setErro("");
    formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelar = () => {
    setEditando(null);
    setForm(formVazio);
    setErro("");
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    if (!form.nome.trim()) {
      setErro("Informe o nome da equipe.");
      document.getElementById("equipe-nome")?.focus();
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const r = editando ? await api.put(`/equipes/${editando._id}`, form) : await api.post("/equipes", form);
      toast.sucesso(r.message);
      cancelar();
      depoisDeMudar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  // Vindo do Início: ?editar=Nome abre a edição da equipe; ?nova=1 vai direto para o cadastro.
  useEffect(() => {
    if (!equipes) return;
    const editar = params.get("editar");
    const nova = params.get("nova");
    if (!editar && !nova) return;
    if (editar) {
      const alvo = equipes.find((e) => chaveEquipe(e.nome) === chaveEquipe(editar));
      if (alvo) iniciarEdicao(alvo);
    }
    setTimeout(() => document.getElementById("equipe-nome")?.focus(), 50);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipes]);

  const renomeando = editando && form.nome.trim() && form.nome.trim() !== editando.nome;

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Configurações", to: "/config" }, { label: "Equipes" }]}
        title="Equipes"
        description="Equipes de Saúde da Família da unidade. Aumente ou diminua o número de equipes conforme a unidade se organiza."
      />

      <div className="stack">
        <div ref={formularioRef} style={{ scrollMarginTop: 72 }}>
          <Section
            title={editando ? `Editar a equipe ${editando.nome}` : "Cadastrar equipe"}
            description={editando ? "Mude o nome ou o ícone." : "A equipe nova aparece no menu, no cadastro de ACS, no território e nos relatórios."}
          >
            <form onSubmit={salvar} noValidate>
              <div className="form-grid">
                {erro && (
                  <div>
                    <Alert type="danger">{erro}</Alert>
                  </div>
                )}
                <Field className="span-3" label="Nome da equipe" required htmlFor="equipe-nome" hint="Ex.: Lua, Mar, Equipe 6. Até 30 letras.">
                  {(props) => (
                    <input
                      {...props}
                      className="input"
                      maxLength={30}
                      value={form.nome}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, nome: e.target.value }));
                        setErro("");
                      }}
                      autoComplete="off"
                    />
                  )}
                </Field>
                <SeletorIcone valor={form.icone} onChange={(icone) => setForm((f) => ({ ...f, icone }))} />
                {renomeando && (
                  <Alert type="info">
                    Ao salvar, os pacientes, ACS, microáreas, pedidos e presenças da equipe {editando.nome} passam a usar o nome {form.nome.trim()}. Quem estiver com o sistema aberto
                    vê o nome novo ao recarregar a página.
                  </Alert>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  {editando && (
                    <Button type="button" onClick={cancelar}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" variant="primary" icon={editando ? Save : Plus} loading={salvando} loadingText="Salvando…" className="btn--block-mobile">
                    {editando ? "Salvar alterações" : "Cadastrar equipe"}
                  </Button>
                </div>
              </div>
            </form>
          </Section>
        </div>

        <Section
          title="Equipes cadastradas"
          description={equipes ? plural(equipes.length, "equipe", "equipes") : undefined}
          bodyClassName="section__body--flush"
        >
          {erroLista ? (
            <div style={{ padding: "var(--space-4)" }}>
              <Alert type="danger" action={<Button size="sm" icon={RotateCw} onClick={carregar}>Tentar de novo</Button>}>
                {erroLista}
              </Alert>
            </div>
          ) : !equipes ? (
            <div style={{ padding: "var(--space-4)", display: "grid", gap: 12 }} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={48} />
              ))}
            </div>
          ) : equipes.length === 0 ? (
            <EmptyState icon={UsersRound} title="Nenhuma equipe cadastrada" />
          ) : (
            <ul className="list">
              {equipes.map((e) => (
                <li key={e._id} className="list-item" style={{ alignItems: "center", flexWrap: "wrap" }}>
                  <TeamIcon equipe={e} size={40} />
                  <div className="list-item__main">
                    <p className="list-item__title" style={{ margin: "0 0 6px" }}>
                      Equipe {e.nome}
                    </p>
                    <Contagens v={e.vinculos} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button size="sm" icon={Eye} onClick={() => setVendo(e)}>
                      Visualizar
                    </Button>
                    <Button size="sm" icon={Pencil} onClick={() => iniciarEdicao(e)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => setExcluindo(e)} disabled={equipes.length <= 1} title={equipes.length <= 1 ? "O sistema precisa de pelo menos uma equipe" : undefined}>
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {vendo && <VisualizarEquipe equipe={vendo} onFechar={() => setVendo(null)} />}
      {excluindo && (
        <ExcluirEquipe
          equipe={excluindo}
          outras={(equipes || []).filter((o) => o._id !== excluindo._id)}
          onFechar={() => setExcluindo(null)}
          onExcluida={() => {
            setExcluindo(null);
            if (editando?._id === excluindo._id) cancelar();
            depoisDeMudar();
          }}
        />
      )}
    </AppLayout>
  );
}

export default GerenciarEquipes;
