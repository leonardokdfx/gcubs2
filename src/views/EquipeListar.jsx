"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "../lib/router";
import { Plus, Printer, Search, Pencil, Trash2, Phone, MapPin, MapPinned, Clock, Users, SearchX, RotateCw, X } from "lucide-react";
import api from "../services/api";
import AppLayout from "../components/AppLayout";
import { Alert, Button, ButtonLink, EmptyState, PageHeader, Skeleton, StatusSelect } from "../components/ui";
import { ConfirmDialog, useToast } from "../components/feedback";
import { StatusBar } from "../components/StatusBar";
import { useDesktop } from "../hooks/dados";
import { SITUACOES, contarSituacoes, situacaoDe, situacaoPorChave } from "../constants/dominio";
import {
  enderecoCompleto,
  exibirCPF,
  exibirTelefone,
  hrefTelefone,
  normalizar,
  plural,
  primeiroNome,
  rotuloMicroarea,
  somenteDigitos,
} from "../utils/formatos";
import { imprimirPacientes } from "../utils/imprimir";

const FILTROS = [
  { chave: "todos", rotulo: "Todos" },
  ...[SITUACOES[3], SITUACOES[0], SITUACOES[1], SITUACOES[2]].map((s) => ({ chave: s.chave, rotulo: s.curto })),
];

function Telefone({ valor }) {
  const href = hrefTelefone(valor);
  const texto = exibirTelefone(valor);
  return href ? <a href={href}>{texto}</a> : <span>{texto}</span>;
}

function CarregandoLista({ desktop }) {
  return (
    <div className="paper list-paper" aria-hidden="true">
      {Array.from({ length: desktop ? 6 : 4 }).map((_, i) => (
        <div key={i} style={{ padding: 16, borderTop: i ? "1px solid var(--gray-90)" : 0, display: "grid", gap: 8 }}>
          <Skeleton width={desktop ? "30%" : "60%"} height={16} />
          <Skeleton width={desktop ? "50%" : "80%"} height={12} />
          {!desktop && <Skeleton height={44} />}
        </div>
      ))}
    </div>
  );
}

function EquipeListar() {
  const { equipe } = useParams();
  const toast = useToast();
  const desktop = useDesktop();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pacientes, setPacientes] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState({});
  const [excluindo, setExcluindo] = useState(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const filtro = FILTROS.some((f) => f.chave === searchParams.get("situacao")) ? searchParams.get("situacao") : "todos";
  const filtroMicro = searchParams.get("microarea") || "";

  const carregarPacientes = () => {
    setCarregando(true);
    setErro("");
    api
      .get(`/pacientes/${encodeURIComponent(equipe)}`)
      .then(setPacientes)
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarPacientes();
    setSelecionados([]);
    setBusca("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipe]);

  // Microáreas presentes na lista (para o filtro).
  const microareasDaLista = useMemo(
    () => [...new Set(pacientes.map((p) => p.microarea).filter(Boolean))].sort((a, b) => a - b),
    [pacientes]
  );
  const temSemMicro = pacientes.some((p) => !p.microarea);

  const porMicro = useMemo(() => {
    if (!filtroMicro) return pacientes;
    if (filtroMicro === "sem") return pacientes.filter((p) => !p.microarea);
    return pacientes.filter((p) => String(p.microarea) === filtroMicro);
  }, [pacientes, filtroMicro]);

  const definirMicro = (valor) => {
    const params = new URLSearchParams(searchParams);
    if (valor) params.set("microarea", valor);
    else params.delete("microarea");
    setSearchParams(params, { replace: true });
  };

  const porBusca = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return porMicro;
    const digitos = somenteDigitos(busca);
    return porMicro.filter(
      (p) =>
        normalizar(p.nome).includes(termo) ||
        normalizar(enderecoCompleto(p)).includes(termo) ||
        (digitos.length >= 3 && (somenteDigitos(p.cpf).includes(digitos) || somenteDigitos(p.telefone).includes(digitos)))
    );
  }, [porMicro, busca]);

  const contagem = useMemo(() => contarSituacoes(porBusca), [porBusca]);
  const contagemEquipe = useMemo(() => contarSituacoes(pacientes), [pacientes]);

  const visiveis = useMemo(
    () => (filtro === "todos" ? porBusca : porBusca.filter((p) => situacaoDe(p.status).chave === filtro)),
    [porBusca, filtro]
  );

  const definirFiltro = (chave) => {
    const params = new URLSearchParams(searchParams);
    if (chave === "todos") params.delete("situacao");
    else params.set("situacao", chave);
    setSearchParams(params, { replace: true });
  };

  const alternarSelecao = (id) =>
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]));

  const todosVisiveisSelecionados = visiveis.length > 0 && visiveis.every((p) => selecionados.includes(p._id));
  const alternarTodos = () => {
    const ids = visiveis.map((p) => p._id);
    setSelecionados((atual) =>
      todosVisiveisSelecionados ? atual.filter((id) => !ids.includes(id)) : Array.from(new Set([...atual, ...ids]))
    );
  };

  const rotuloFiltro = filtro === "todos" ? "Todos os pacientes" : situacaoPorChave(filtro).tituloRelatorio;

  const imprimir = (lista, subtitulo) => {
    if (lista.length === 0) {
      toast.info("Não há pacientes na lista para imprimir.");
      return;
    }
    const ok = imprimirPacientes(lista, { titulo: `Equipe ${equipe}`, subtitulo });
    if (!ok) toast.erro("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
  };

  const atualizarStatus = async (paciente, novoStatus) => {
    const anterior = paciente.status;
    setPacientes((lista) => lista.map((p) => (p._id === paciente._id ? { ...p, status: novoStatus } : p)));
    setSalvando((s) => ({ ...s, [paciente._id]: true }));
    try {
      await api.put(`/pacientes/${paciente._id}`, { status: novoStatus });
      toast.sucesso(`${primeiroNome(paciente.nome)}: ${situacaoDe(novoStatus).rotulo.toLowerCase()}.`);
    } catch (err) {
      setPacientes((lista) => lista.map((p) => (p._id === paciente._id ? { ...p, status: anterior } : p)));
      toast.erro(err.message || "Não foi possível atualizar a situação da visita.");
    } finally {
      setSalvando((s) => {
        const novo = { ...s };
        delete novo[paciente._id];
        return novo;
      });
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    setConfirmandoExclusao(true);
    try {
      await api.delete(`/pacientes/${excluindo._id}`);
      setPacientes((lista) => lista.filter((p) => p._id !== excluindo._id));
      setSelecionados((lista) => lista.filter((id) => id !== excluindo._id));
      toast.sucesso(`Cadastro de ${excluindo.nome} excluído.`);
      setExcluindo(null);
    } catch (err) {
      toast.erro(err.message || "Não foi possível excluir o paciente.");
    } finally {
      setConfirmandoExclusao(false);
    }
  };

  const urlNovo = `/equipe/${encodeURIComponent(equipe)}/adicionar`;
  const urlEditar = (p) => `/equipe/${encodeURIComponent(equipe)}/editar/${p._id}`;

  const listaVazia = !carregando && !erro && pacientes.length === 0;
  const semResultado = !carregando && !erro && pacientes.length > 0 && visiveis.length === 0;

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/dashboard" }, { label: `Equipe ${equipe}` }]}
        title={`Equipe ${equipe}`}
        description={
          carregando
            ? "Carregando pacientes…"
            : `${plural(contagemEquipe.total, "paciente", "pacientes")} · ${contagemEquipe.pendente.toLocaleString("pt-BR")} pendentes de visita`
        }
        actions={
          <>
            <ButtonLink to={urlNovo} variant="primary" icon={Plus}>
              Cadastrar paciente
            </ButtonLink>
            <Button icon={Printer} onClick={() => imprimir(visiveis, rotuloFiltro)} disabled={carregando || visiveis.length === 0}>
              Imprimir lista
            </Button>
          </>
        }
      />

      <div className="stack">
        {erro && (
          <Alert
            type="danger"
            title="Não foi possível carregar os pacientes"
            action={
              <Button size="sm" icon={RotateCw} onClick={carregarPacientes}>
                Tentar de novo
              </Button>
            }
          >
            {erro}
          </Alert>
        )}

        {!carregando && !erro && pacientes.length > 0 && (
          <>
            <StatusBar contagem={contagemEquipe} rotulo={`Andamento da equipe ${equipe}`} />

            <div className="toolbar">
              <div className="toolbar__search">
                <label htmlFor="busca-pacientes" className="sr-only">
                  Buscar paciente
                </label>
                <div className="input-wrap input-wrap--icon input-wrap--action">
                  <Search className="input-wrap__icon" aria-hidden="true" />
                  <input
                    id="busca-pacientes"
                    type="search"
                    className="input"
                    placeholder="Buscar por nome, CPF ou endereço"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  {busca && (
                    <button type="button" className="input-wrap__action" onClick={() => setBusca("")} aria-label="Limpar busca">
                      <X aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {microareasDaLista.length > 0 && (
                <div className="toolbar__micro">
                  <label htmlFor="filtro-microarea" className="sr-only">
                    Filtrar por microárea
                  </label>
                  <select id="filtro-microarea" className="select" value={filtroMicro} onChange={(e) => definirMicro(e.target.value)}>
                    <option value="">Todas as microáreas</option>
                    {microareasDaLista.map((n) => (
                      <option key={n} value={String(n)}>
                        {rotuloMicroarea(n)} ({pacientes.filter((p) => p.microarea === n).length})
                      </option>
                    ))}
                    {temSemMicro && <option value="sem">Sem microárea ({pacientes.filter((p) => !p.microarea).length})</option>}
                  </select>
                </div>
              )}

              <div className="chips" role="group" aria-label="Filtrar por situação da visita">
                {FILTROS.map((f) => (
                  <button
                    key={f.chave}
                    type="button"
                    className="chip"
                    data-status={f.chave !== "todos" ? f.chave : undefined}
                    aria-pressed={filtro === f.chave}
                    onClick={() => definirFiltro(f.chave)}
                  >
                    {f.chave !== "todos" && <span className="chip__dot" aria-hidden="true" />}
                    {f.rotulo}
                    <span className="chip__count">{(f.chave === "todos" ? contagem.total : contagem[f.chave]).toLocaleString("pt-BR")}</span>
                  </button>
                ))}
              </div>
            </div>

            {selecionados.length > 0 && (
              <div className="selection-bar" role="region" aria-label="Pacientes selecionados">
                <span aria-live="polite">{plural(selecionados.length, "selecionado", "selecionados")}</span>
                <div className="selection-bar__actions">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Printer}
                    onClick={() => imprimir(pacientes.filter((p) => selecionados.includes(p._id)), "Pacientes selecionados")}
                  >
                    Imprimir selecionados
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelecionados([])}>
                    Limpar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {carregando && <CarregandoLista desktop={desktop} />}

        {listaVazia && (
          <div className="paper">
            <EmptyState
              icon={Users}
              title="Nenhum paciente cadastrado nesta equipe"
              action={
                <ButtonLink to={urlNovo} variant="primary" icon={Plus}>
                  Cadastrar o primeiro paciente
                </ButtonLink>
              }
            >
              Cadastre os pacientes da área da equipe {equipe} para começar a registrar as visitas.
            </EmptyState>
          </div>
        )}

        {semResultado && (
          <div className="paper">
            <EmptyState
              icon={SearchX}
              title={busca ? `Nenhum paciente encontrado para “${busca}”` : "Nenhum paciente nesta situação"}
              action={
                <Button
                  onClick={() => {
                    setBusca("");
                    definirFiltro("todos");
                  }}
                >
                  Limpar busca e filtros
                </Button>
              }
            >
              Confira a grafia ou busque pelo CPF, telefone ou endereço.
            </EmptyState>
          </div>
        )}

        {!carregando && !erro && visiveis.length > 0 &&
          (desktop ? (
            <div className="paper list-paper">
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">
                    {rotuloFiltro} da equipe {equipe}
                  </caption>
                  <thead>
                    <tr>
                      <th className="col-check" scope="col">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={todosVisiveisSelecionados}
                          onChange={alternarTodos}
                          aria-label="Selecionar todos os pacientes da lista"
                        />
                      </th>
                      <th scope="col">Paciente</th>
                      <th scope="col">CPF</th>
                      <th scope="col">Telefone</th>
                      <th scope="col">Melhor horário</th>
                      <th scope="col" className="status-col">
                        Situação da visita
                      </th>
                      <th scope="col" className="col-actions">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((p) => {
                      const selecionado = selecionados.includes(p._id);
                      return (
                        <tr key={p._id} data-selected={selecionado || undefined}>
                          <td className="col-check">
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={selecionado}
                              onChange={() => alternarSelecao(p._id)}
                              aria-label={`Selecionar ${p.nome}`}
                            />
                          </td>
                          <td>
                            <Link to={urlEditar(p)} className="cell-primary" style={{ textDecoration: "none" }}>
                              {p.nome}
                            </Link>
                            <div className="cell-secondary">
                              {enderecoCompleto(p) || "Endereço não informado"}
                              {p.microarea ? ` · ${rotuloMicroarea(p.microarea)}` : ""}
                            </div>
                          </td>
                          <td className="num" style={{ whiteSpace: "nowrap" }}>
                            {exibirCPF(p.cpf)}
                          </td>
                          <td className="num" style={{ whiteSpace: "nowrap" }}>
                            <Telefone valor={p.telefone} />
                          </td>
                          <td>{p.melhorHorario || "—"}</td>
                          <td className="status-col">
                            <StatusSelect
                              status={p.status}
                              onChange={(valor) => atualizarStatus(p, valor)}
                              disabled={!!salvando[p._id]}
                              label={`Situação da visita de ${p.nome}`}
                            />
                          </td>
                          <td className="col-actions">
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              <ButtonLink
                                to={urlEditar(p)}
                                size="sm"
                                className="btn--ghost btn--icon"
                                icon={Pencil}
                                aria-label={`Editar ${p.nome}`}
                                title="Editar"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="btn--danger-text"
                                icon={Trash2}
                                onClick={() => setExcluindo(p)}
                                aria-label={`Excluir ${p.nome}`}
                                title="Excluir"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="paper list-paper">
              <div className="list-paper__head">
                <label>
                  <input type="checkbox" className="checkbox" checked={todosVisiveisSelecionados} onChange={alternarTodos} />
                  Selecionar todos
                </label>
                <span style={{ marginLeft: "auto" }}>{plural(visiveis.length, "paciente", "pacientes")}</span>
              </div>
              <ul className="list" aria-label={`${rotuloFiltro} da equipe ${equipe}`}>
                {visiveis.map((p) => {
                  const selecionado = selecionados.includes(p._id);
                  return (
                    <li key={p._id} className="list-item" data-selected={selecionado || undefined}>
                      <label className="checkbox-hit" style={{ margin: "-10px -12px 0 -14px", alignSelf: "flex-start" }}>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selecionado}
                          onChange={() => alternarSelecao(p._id)}
                          aria-label={`Selecionar ${p.nome}`}
                        />
                      </label>
                      <div className="list-item__main">
                        <Link to={urlEditar(p)} className="list-item__title list-item__link">
                          {p.nome}
                        </Link>
                        <div className="list-item__meta">
                          <span className="list-item__meta-row">
                            <MapPin aria-hidden="true" />
                            <span>
                              {enderecoCompleto(p) || "Endereço não informado"}
                              {p.pontoReferencia && ` · ${p.pontoReferencia}`}
                            </span>
                          </span>
                          <span className="list-item__meta-row">
                            <Phone aria-hidden="true" />
                            <Telefone valor={p.telefone} />
                            <span aria-hidden="true">·</span>
                            <span className="num">CPF {exibirCPF(p.cpf)}</span>
                          </span>
                          {p.microarea && (
                            <span className="list-item__meta-row">
                              <MapPinned aria-hidden="true" />
                              <span>{rotuloMicroarea(p.microarea)}</span>
                            </span>
                          )}
                          {p.melhorHorario && (
                            <span className="list-item__meta-row">
                              <Clock aria-hidden="true" />
                              <span>{p.melhorHorario}</span>
                            </span>
                          )}
                        </div>
                        <div className="list-item__actions">
                          <StatusSelect
                            status={p.status}
                            onChange={(valor) => atualizarStatus(p, valor)}
                            disabled={!!salvando[p._id]}
                            label={`Situação da visita de ${p.nome}`}
                          />
                          <ButtonLink to={urlEditar(p)} className="btn--icon" icon={Pencil} aria-label={`Editar ou excluir ${p.nome}`} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>

      <ConfirmDialog
        open={!!excluindo}
        danger
        title="Excluir paciente?"
        confirmLabel="Excluir paciente"
        loading={confirmandoExclusao}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluindo(null)}
      >
        O cadastro de <strong>{excluindo?.nome}</strong> será excluído permanentemente da equipe {equipe}. Essa ação não pode ser desfeita.
      </ConfirmDialog>
    </AppLayout>
  );
}

export default EquipeListar;
