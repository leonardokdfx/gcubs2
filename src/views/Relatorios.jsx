"use client";

import React from "react";
import { Link } from "../lib/router";
import { ChartColumn, RotateCw, List } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { Alert, Button, ButtonLink, EmptyState, PageHeader, Section, Skeleton, TeamIcon } from "../components/ui";
import { StatusBar, StatusLegend } from "../components/StatusBar";
import { useDesktop, useResumoEquipes } from "../hooks/dados";
import { SITUACOES } from "../constants/dominio";
import { percentual, plural } from "../utils/formatos";

const urlStatus = (s) => `/relatorios/status/${encodeURIComponent(s.rota)}`;
const ORDEM_COLUNAS = [SITUACOES[3], SITUACOES[0], SITUACOES[1], SITUACOES[2]];

function Relatorios() {
  const { user } = useAuth();
  const desktop = useDesktop();
  const supervisor = user?.role === "supervisor";
  const { carregando, erro, porEquipe, geral, recarregar } = useResumoEquipes(user);
  const comVisita = geral.total - geral.pendente;

  return (
    <AppLayout>
      <PageHeader
        title="Relatórios"
        description={supervisor ? "Situação das visitas domiciliares de todas as equipes." : `Situação das visitas da equipe ${user?.equipe || ""}.`}
        actions={
          <ButtonLink to="/relatorios/status/Todos" icon={List}>
            Lista de todos os pacientes
          </ButtonLink>
        }
      />

      {erro ? (
        <Alert
          type="danger"
          title="Não foi possível carregar os relatórios"
          action={
            <Button size="sm" icon={RotateCw} onClick={recarregar}>
              Tentar de novo
            </Button>
          }
        >
          {erro}
        </Alert>
      ) : (
        <div className="stack">
          <Section title="Situação geral" description="Toque em uma situação para ver a lista de pacientes.">
            {carregando ? (
              <div style={{ display: "grid", gap: 16 }} aria-hidden="true">
                <Skeleton width="55%" height={32} />
                <Skeleton height={28} />
                <Skeleton width="70%" height={14} />
              </div>
            ) : geral.total === 0 ? (
              <EmptyState icon={ChartColumn} title="Ainda não há pacientes cadastrados">
                Os relatórios aparecem assim que as equipes cadastrarem pacientes.
              </EmptyState>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-5)" }}>
                <p className="overview-line">
                  <span className="overview-line__value">{percentual(comVisita, geral.total)}%</span>
                  <span className="overview-line__label">
                    dos {plural(geral.total, "paciente", "pacientes")} com visita registrada ·{" "}
                    {plural(geral.pendente, "pendente", "pendentes")}
                  </span>
                </p>
                <StatusBar contagem={geral} variant="tall" rotulo="Situação geral das visitas" linkPara={urlStatus} />
                <StatusLegend contagem={geral} linkPara={urlStatus} />
              </div>
            )}
          </Section>

          {supervisor && !carregando && geral.total > 0 && (
            <Section title="Por equipe" bodyClassName="section__body--flush">
              {desktop ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Equipe</th>
                        <th scope="col" className="bar-cell">
                          Andamento
                        </th>
                        {ORDEM_COLUNAS.map((s) => (
                          <th key={s.chave} scope="col" className="col-num">
                            {s.curto}
                          </th>
                        ))}
                        <th scope="col" className="col-num">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {porEquipe.map(({ equipe, contagem }) => (
                        <tr key={equipe.nome}>
                          <td>
                            <Link to={`/equipe/${encodeURIComponent(equipe.nome)}`} className="team-cell" style={{ textDecoration: "none", color: "var(--color-text)" }}>
                              <TeamIcon equipe={equipe} size={28} />
                              Equipe {equipe.nome}
                            </Link>
                          </td>
                          <td className="bar-cell">
                            <StatusBar contagem={contagem} rotulo={`Andamento da equipe ${equipe.nome}`} />
                          </td>
                          {ORDEM_COLUNAS.map((s) => (
                            <td key={s.chave} className="col-num">
                              {contagem[s.chave].toLocaleString("pt-BR")}
                            </td>
                          ))}
                          <td className="col-num" style={{ fontWeight: 700 }}>
                            {contagem.total.toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {porEquipe.length > 1 && (
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className="bar-cell" />
                          {ORDEM_COLUNAS.map((s) => (
                            <td key={s.chave} className="col-num">
                              {geral[s.chave].toLocaleString("pt-BR")}
                            </td>
                          ))}
                          <td className="col-num">{geral.total.toLocaleString("pt-BR")}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                <ul className="list">
                  {porEquipe.map(({ equipe, contagem }) => (
                    <li key={equipe.nome} className="report-row">
                      <div className="report-row__head">
                        <TeamIcon equipe={equipe} size={32} />
                        <Link to={`/equipe/${encodeURIComponent(equipe.nome)}`} className="report-row__name">
                          Equipe {equipe.nome}
                        </Link>
                        <span className="report-row__total">{plural(contagem.total, "paciente", "pacientes")}</span>
                      </div>
                      <StatusBar contagem={contagem} rotulo={`Andamento da equipe ${equipe.nome}`} />
                      <dl className="report-counts">
                        {ORDEM_COLUNAS.map((s) => (
                          <div key={s.chave}>
                            <dt>{s.curto}</dt>
                            <dd>{contagem[s.chave].toLocaleString("pt-BR")}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default Relatorios;
