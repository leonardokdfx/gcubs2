"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapPinned, Pencil, Plus, RotateCw, Trash2, TriangleAlert, UserRound } from "lucide-react";
import api from "../services/api";
import AppLayout from "../components/AppLayout";
import { Alert, Button, EmptyState, Field, PageHeader, Section, Skeleton, TeamIcon } from "../components/ui";
import { ConfirmDialog, FormDialog, useToast } from "../components/feedback";
import { EQUIPES, NOMES_EQUIPES } from "../constants/dominio";
import { plural, rotuloMicroarea } from "../utils/formatos";
import { escreverListaCeps, lerListaCeps } from "../utils/agendamento";

// Quadras de cada microárea da equipe Água, informadas pela unidade.
// Os CEPs de cada endereço são colados depois, na edição de cada microárea.
const MODELO_AGUA = [
  { numero: 1, descricao: "SGAN 904, SCRN 704/705, SCLRN 704, SHCGN 704" },
  { numero: 2, descricao: "CLN 304, EQN 504/505, SEPN 504, SQN 304" },
  { numero: 3, descricao: "CLN 104, CLN 204, SHCN 204/404, SQN 104, SQN 204" },
  { numero: 4, descricao: "CLN 404, SGAN 604, SQN 404" },
];

function EditarMicroarea({ microarea, equipeInicial, onFechar, onSalvo, onExcluir }) {
  const toast = useToast();
  const nova = !microarea._id;
  const [equipe, setEquipe] = useState(microarea.equipe || equipeInicial || "");
  const [numero, setNumero] = useState(microarea.numero ? String(microarea.numero) : "");
  const [descricao, setDescricao] = useState(microarea.descricao || "");
  const [agente, setAgente] = useState(microarea.agente?._id || microarea.agente || "");
  const [cepsTexto, setCepsTexto] = useState(escreverListaCeps(microarea.ceps));
  const [agentes, setAgentes] = useState([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!equipe) return;
    api
      .get(`/auth/responsaveis/${encodeURIComponent(equipe)}`)
      .then(setAgentes)
      .catch((err) => setErro(err.message));
  }, [equipe]);

  const leitura = useMemo(() => lerListaCeps(cepsTexto), [cepsTexto]);

  const salvar = async () => {
    setErro("");
    if (!equipe) return setErro("Selecione a equipe.");
    if (!numero) return setErro("Informe o número da microárea.");
    if (leitura.invalidas.length > 0) return setErro(`Linha sem CEP válido: "${leitura.invalidas[0]}".`);
    setSalvando(true);
    try {
      const corpo = { equipe, numero: Number(numero), descricao, agente: agente || null, cepsTexto };
      if (nova) await api.post("/territorio", corpo);
      else await api.put(`/territorio/${microarea._id}`, corpo);
      toast.sucesso(`${rotuloMicroarea(numero)} da equipe ${equipe} salva.`);
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <FormDialog
      open
      wide
      title={nova ? "Nova microárea" : `${rotuloMicroarea(microarea.numero)} · Equipe ${microarea.equipe}`}
      submitLabel="Salvar microárea"
      loading={salvando}
      onSubmit={salvar}
      onCancel={onFechar}
      extraAction={
        !nova && (
          <Button variant="ghost" className="btn--danger-text" icon={Trash2} onClick={onExcluir} disabled={salvando} style={{ marginRight: "auto" }}>
            Excluir
          </Button>
        )
      }
    >
      {erro && <Alert type="danger">{erro}</Alert>}
      <div className="form-grid">
        <Field className="span-3" label="Equipe" required htmlFor="micro-equipe">
          {(props) => (
            <select {...props} className="select" value={equipe} onChange={(e) => { setEquipe(e.target.value); setAgente(""); }}>
              <option value="">Selecione</option>
              {NOMES_EQUIPES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field className="span-3" label="Número da microárea" required htmlFor="micro-numero">
          {(props) => (
            <input {...props} className="input num" type="number" min={1} max={99} inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
          )}
        </Field>
        <Field label="Quadras e endereços" optional htmlFor="micro-descricao" hint="Resumo para a equipe, ex.: CLN 404, SGAN 604, SQN 404">
          {(props) => <input {...props} className="input" value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
        </Field>
        <Field
          label="ACS responsável"
          optional
          htmlFor="micro-agente"
          hint={
            agentes.length === 0 && equipe
              ? "Nenhum agente cadastrado nesta equipe. Sem ACS definido, os pedidos aparecem para toda a equipe."
              : "Os pedidos de cadastro desta microárea vão direto para este agente."
          }
        >
          {(props) => (
            <select {...props} className="select" value={agente} onChange={(e) => setAgente(e.target.value)} disabled={!equipe}>
              <option value="">Sem ACS definido (pedidos vão para toda a equipe)</option>
              {agentes.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.nome}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label="CEPs da microárea"
          htmlFor="micro-ceps"
          hint="Um CEP por linha, com o endereço ao lado. Pode colar duas colunas direto do Excel. Ex.: 70766-010 SQN 404 Bloco A"
        >
          {(props) => (
            <textarea
              {...props}
              className="textarea num"
              rows={8}
              value={cepsTexto}
              onChange={(e) => setCepsTexto(e.target.value)}
              placeholder={"70000-000 SQN 404 Bloco A\n70000-001 SQN 404 Bloco B"}
              spellCheck={false}
            />
          )}
        </Field>
      </div>
      <p className="field__hint" aria-live="polite" style={{ margin: 0 }}>
        {plural(leitura.ceps.length, "CEP reconhecido", "CEPs reconhecidos")}
        {leitura.repetidos.length > 0 && ` · ${plural(leitura.repetidos.length, "repetido ignorado", "repetidos ignorados")}`}
        {leitura.invalidas.length > 0 && ` · ${plural(leitura.invalidas.length, "linha sem CEP", "linhas sem CEP")}`}
      </p>
    </FormDialog>
  );
}

function Territorio() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .get("/territorio")
      .then((data) => {
        setLista(data);
        setErro("");
      })
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(carregar, [carregar]);

  const totalCeps = lista.reduce((n, m) => n + m.ceps.length, 0);

  const criarModeloAgua = async () => {
    setProcessando(true);
    try {
      for (const m of MODELO_AGUA) {
        await api.post("/territorio", { equipe: "Água", numero: m.numero, descricao: m.descricao, cepsTexto: "" });
      }
      toast.sucesso("Microáreas 01 a 04 da equipe Água criadas. Agora cole os CEPs de cada uma.");
      carregar();
    } catch (err) {
      toast.erro(err.message);
      carregar();
    } finally {
      setProcessando(false);
    }
  };

  const excluir = async () => {
    setProcessando(true);
    try {
      await api.delete(`/territorio/${excluindo._id}`);
      toast.sucesso(`${rotuloMicroarea(excluindo.numero)} da equipe ${excluindo.equipe} excluída.`);
      setExcluindo(null);
      setEditando(null);
      carregar();
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Configurações", to: "/config" }, { label: "Território" }]}
        title="Território"
        description="Microáreas de cada equipe, o ACS responsável e os CEPs que cada uma cobre. Só moradores destes CEPs conseguem pedir cadastro pela área do paciente."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditando({ microarea: {}, equipe: "" })}>
            Nova microárea
          </Button>
        }
      />

      <div className="stack">
        {erro && (
          <Alert type="danger" action={<Button size="sm" icon={RotateCw} onClick={carregar}>Tentar de novo</Button>}>
            {erro}
          </Alert>
        )}

        {!carregando && !erro && totalCeps === 0 && (
          <Alert type="warning" title="Nenhum CEP cadastrado">
            Enquanto não houver CEPs, a área do paciente recusa todos os pedidos de cadastro. Abra cada microárea e cole os CEPs do território.
          </Alert>
        )}

        {!carregando && !erro && totalCeps > 0 && (
          <p className="field__hint" style={{ margin: 0 }}>
            {plural(lista.length, "microárea", "microáreas")} · {plural(totalCeps, "CEP", "CEPs")} no território
          </p>
        )}

        {carregando
          ? [0, 1].map((i) => (
              <div key={i} className="paper" style={{ padding: 20, display: "grid", gap: 12 }} aria-hidden="true">
                <Skeleton width="30%" height={18} />
                <Skeleton height={14} />
                <Skeleton width="60%" height={14} />
              </div>
            ))
          : !erro &&
            EQUIPES.map((equipe) => {
              const micro = lista.filter((m) => m.equipe === equipe.nome);
              return (
                <Section
                  key={equipe.nome}
                  title={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <TeamIcon equipe={equipe} size={28} />
                      Equipe {equipe.nome}
                    </span>
                  }
                  description={micro.length ? plural(micro.length, "microárea", "microáreas") : "Nenhuma microárea cadastrada"}
                  actions={
                    <Button size="sm" icon={Plus} onClick={() => setEditando({ microarea: {}, equipe: equipe.nome })}>
                      Microárea
                    </Button>
                  }
                  bodyClassName={micro.length ? "section__body--flush" : ""}
                >
                  {micro.length === 0 ? (
                    equipe.nome === "Água" ? (
                      <Alert
                        type="info"
                        title="Começar pelas microáreas informadas"
                        action={
                          <Button size="sm" variant="primary" loading={processando} onClick={criarModeloAgua}>
                            Criar 01 a 04
                          </Button>
                        }
                      >
                        Cria as microáreas 01 a 04 com as quadras de cada uma. Depois é só colar os CEPs.
                      </Alert>
                    ) : (
                      <EmptyState icon={MapPinned} title="Sem microáreas">
                        Cadastre as microáreas da equipe {equipe.nome} para que os moradores possam pedir cadastro.
                      </EmptyState>
                    )
                  ) : (
                    <ul className="list">
                      {micro.map((m) => (
                        <li key={m._id} className="list-item">
                          <div className="list-item__main">
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                              <button type="button" className="list-item__title list-item__link" onClick={() => setEditando({ microarea: m })} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}>
                                {rotuloMicroarea(m.numero)}
                              </button>
                              <span className={m.ceps.length ? "tag tag--primary" : "tag"} data-status={m.ceps.length ? undefined : "naomora"}>
                                {plural(m.ceps.length, "CEP", "CEPs")}
                              </span>
                            </div>
                            <div className="list-item__meta">
                              {m.descricao && <span className="list-item__meta-row">{m.descricao}</span>}
                              <span className="list-item__meta-row">
                                {m.agente ? <UserRound aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
                                <span>{m.agente ? `ACS ${m.agente.nome}` : "Sem ACS definido: pedidos vão para toda a equipe"}</span>
                              </span>
                            </div>
                          </div>
                          <Button className="btn--icon" icon={Pencil} aria-label={`Editar ${rotuloMicroarea(m.numero)} da equipe ${m.equipe}`} onClick={() => setEditando({ microarea: m })} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              );
            })}
      </div>

      {editando && !excluindo && (
        <EditarMicroarea
          microarea={editando.microarea}
          equipeInicial={editando.equipe}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
          onExcluir={() => setExcluindo(editando.microarea)}
        />
      )}

      <ConfirmDialog
        open={!!excluindo}
        danger
        title="Excluir microárea?"
        confirmLabel="Excluir microárea"
        loading={processando}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      >
        {excluindo && (
          <>
            A {rotuloMicroarea(excluindo.numero).toLowerCase()} da equipe {excluindo.equipe} e seus {excluindo.ceps.length} CEPs saem do
            território. Moradores desses CEPs não vão mais conseguir pedir cadastro pelo site. Os pacientes já cadastrados não mudam.
          </>
        )}
      </ConfirmDialog>
    </AppLayout>
  );
}

export default Territorio;
