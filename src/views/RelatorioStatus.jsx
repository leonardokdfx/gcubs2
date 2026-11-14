"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "../lib/router";
import { Printer, Phone, MapPin, SearchX, RotateCw } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { Alert, Button, EmptyState, PageHeader, Skeleton, StatusTag } from "../components/ui";
import { useToast } from "../components/feedback";
import { useDesktop } from "../hooks/dados";
import { equipesDoUsuario, situacaoDe, situacaoPorRota } from "../constants/dominio";
import { enderecoCompleto, exibirCPF, exibirTelefone, hrefTelefone, plural } from "../utils/formatos";
import { imprimirPacientes } from "../utils/imprimir";

function tituloDe(status) {
  if (status === "Todos") return "Todos os pacientes";
  return situacaoPorRota(status)?.tituloRelatorio || status;
}

function RelatorioStatus() {
  const { status } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const desktop = useDesktop();
  const [pacientes, setPacientes] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);
  const supervisor = user?.role === "supervisor";
  const titulo = tituloDe(status);

  useEffect(() => {
    const equipes = equipesDoUsuario(user);
    if (equipes.length === 0) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro("");
    setSelecionados([]);
    Promise.all(equipes.map((e) => api.get(`/pacientes/${encodeURIComponent(e.nome)}`)))
      .then((todas) => {
        const todos = todas.flat();
        const alvo = situacaoPorRota(status);
        setPacientes(status === "Todos" || !alvo ? todos : todos.filter((p) => situacaoDe(p.status).chave === alvo.chave));
      })
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false));
  }, [status, user, versao]);

  const ordenados = useMemo(
    () => [...pacientes].sort((a, b) => (a.equipe || "").localeCompare(b.equipe || "") || (a.nome || "").localeCompare(b.nome || "")),
    [pacientes]
  );

  const alternar = (id) => setSelecionados((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]));
  const todosSelecionados = ordenados.length > 0 && selecionados.length === ordenados.length;

  const imprimir = (lista, subtitulo) => {
    const ok = imprimirPacientes(lista, { titulo, subtitulo, mostrarEquipe: supervisor });
    if (!ok) toast.erro("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
  };

  const abrangencia = supervisor ? "todas as equipes" : `equipe ${user?.equipe || ""}`;

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Relatórios", to: "/relatorios" }, { label: titulo }]}
        title={titulo}
        description={carregando ? "Carregando…" : `${plural(ordenados.length, "paciente", "pacientes")} · ${abrangencia}`}
        actions={
          <Button icon={Printer} onClick={() => imprimir(ordenados, abrangencia)} disabled={carregando || ordenados.length === 0}>
            Imprimir lista
          </Button>
        }
      />

      <div className="stack">
        {erro && (
          <Alert
            type="danger"
            title="Não foi possível carregar a lista"
            action={
              <Button size="sm" icon={RotateCw} onClick={() => setVersao((v) => v + 1)}>
                Tentar de novo
              </Button>
            }
          >
            {erro}
          </Alert>
        )}

        {selecionados.length > 0 && (
          <div className="selection-bar" role="region" aria-label="Pacientes selecionados">
            <span aria-live="polite">{plural(selecionados.length, "selecionado", "selecionados")}</span>
            <div className="selection-bar__actions">
              <Button
                size="sm"
                variant="primary"
                icon={Printer}
                onClick={() => imprimir(ordenados.filter((p) => selecionados.includes(p._id)), "Pacientes selecionados")}
              >
                Imprimir selecionados
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelecionados([])}>
                Limpar
              </Button>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="paper" style={{ padding: 16, display: "grid", gap: 14 }} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={36} />
            ))}
          </div>
        ) : !erro && ordenados.length === 0 ? (
          <div className="paper">
            <EmptyState icon={SearchX} title="Nenhum paciente nesta situação">
              Quando houver pacientes com essa situação de visita, eles aparecem aqui.
            </EmptyState>
          </div>
        ) : !erro && desktop ? (
          <div className="paper list-paper">
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">{titulo}</caption>
                <thead>
                  <tr>
                    <th className="col-check" scope="col">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={todosSelecionados}
                        onChange={(e) => setSelecionados(e.target.checked ? ordenados.map((p) => p._id) : [])}
                        aria-label="Selecionar todos"
                      />
                    </th>
                    <th scope="col">Paciente</th>
                    <th scope="col">CPF</th>
                    <th scope="col">Telefone</th>
                    <th scope="col">Equipe</th>
                    <th scope="col">Situação da visita</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((p) => {
                    const sel = selecionados.includes(p._id);
                    return (
                      <tr key={p._id} data-selected={sel || undefined}>
                        <td className="col-check">
                          <input type="checkbox" className="checkbox" checked={sel} onChange={() => alternar(p._id)} aria-label={`Selecionar ${p.nome}`} />
                        </td>
                        <td>
                          <div className="cell-primary">{p.nome}</div>
                          <div className="cell-secondary">{enderecoCompleto(p) || "Endereço não informado"}</div>
                        </td>
                        <td className="num" style={{ whiteSpace: "nowrap" }}>
                          {exibirCPF(p.cpf)}
                        </td>
                        <td className="num" style={{ whiteSpace: "nowrap" }}>
                          {exibirTelefone(p.telefone)}
                        </td>
                        <td>{p.equipe}</td>
                        <td>
                          <StatusTag status={p.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : !erro ? (
          <div className="paper list-paper">
            <div className="list-paper__head">
              <label>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={todosSelecionados}
                  onChange={(e) => setSelecionados(e.target.checked ? ordenados.map((p) => p._id) : [])}
                />
                Selecionar todos
              </label>
            </div>
            <ul className="list">
              {ordenados.map((p) => {
                const sel = selecionados.includes(p._id);
                const tel = hrefTelefone(p.telefone);
                return (
                  <li key={p._id} className="list-item" data-selected={sel || undefined}>
                    <label className="checkbox-hit" style={{ margin: "-10px -12px 0 -14px", alignSelf: "flex-start" }}>
                      <input type="checkbox" className="checkbox" checked={sel} onChange={() => alternar(p._id)} aria-label={`Selecionar ${p.nome}`} />
                    </label>
                    <div className="list-item__main">
                      <p className="list-item__title">{p.nome}</p>
                      <div className="list-item__meta">
                        <span className="list-item__meta-row">
                          <MapPin aria-hidden="true" />
                          <span>{enderecoCompleto(p) || "Endereço não informado"}</span>
                        </span>
                        <span className="list-item__meta-row">
                          <Phone aria-hidden="true" />
                          {tel ? <a href={tel}>{exibirTelefone(p.telefone)}</a> : <span>{exibirTelefone(p.telefone)}</span>}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                        <StatusTag status={p.status} />
                        {supervisor && <span className="tag">Equipe {p.equipe}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default RelatorioStatus;
