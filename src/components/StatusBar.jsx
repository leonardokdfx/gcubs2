"use client";

import React from "react";
import { Link } from "../lib/router";
import { SITUACOES } from "../constants/dominio";
import { percentual } from "../utils/formatos";

/** Texto acessível com todas as partes, para leitores de tela. */
function descrever(contagem, prefixo) {
  if (!contagem.total) return `${prefixo}: nenhum paciente cadastrado`;
  const partes = SITUACOES.map(
    (s) => `${s.curto.toLowerCase()} ${contagem[s.chave]} (${percentual(contagem[s.chave], contagem.total)}%)`
  ).join(", ");
  return `${prefixo}: ${contagem.total} pacientes; ${partes}`;
}

/**
 * Barra de andamento segmentada por situação da visita.
 * - thin: 8px, sem texto, usada nos painéis de equipe e tabelas;
 * - tall: 28px, com a porcentagem dentro de cada bloco largo o suficiente.
 * Pendentes são o "trilho" cinza: o que ainda falta.
 */
export function StatusBar({ contagem, variant = "thin", rotulo = "Andamento", linkPara }) {
  const total = contagem.total;

  if (!total) {
    return (
      <div className={`status-bar status-bar--${variant} status-bar--empty`} role="img" aria-label={descrever(contagem, rotulo)} />
    );
  }

  return (
    <div
      className={`status-bar status-bar--${variant}`}
      role={linkPara ? "group" : "img"}
      aria-label={descrever(contagem, rotulo)}
    >
      {SITUACOES.map((s) => {
        const valor = contagem[s.chave];
        if (!valor) return null;
        const pct = percentual(valor, total);
        const dica = `${s.rotulo}: ${valor} (${pct}%)`;
        const conteudo =
          variant === "tall" && valor / total >= 0.09 ? <span className="status-bar__label" aria-hidden="true">{pct}%</span> : null;
        const estilo = { flexGrow: valor, flexBasis: 0 };

        return linkPara ? (
          <Link
            key={s.chave}
            to={linkPara(s)}
            className="status-bar__part"
            data-status={s.chave}
            data-tip={dica}
            style={estilo}
            aria-label={`${dica}. Ver lista`}
          >
            {conteudo}
          </Link>
        ) : (
          <span
            key={s.chave}
            className="status-bar__part"
            data-status={s.chave}
            data-tip={variant === "tall" ? dica : undefined}
            style={estilo}
          >
            {conteudo}
          </span>
        );
      })}
    </div>
  );
}

/** Legenda na mesma ordem dos blocos, com a contagem de cada situação. */
export function StatusLegend({ contagem, linkPara, mostrarZeros = true }) {
  return (
    <ul className="status-legend">
      {SITUACOES.map((s) => {
        const valor = contagem[s.chave];
        if (!mostrarZeros && !valor) return null;
        const conteudo = (
          <>
            <span className="status-legend__swatch" aria-hidden="true" />
            <span className="status-legend__name">{s.curto}</span>
            <span className="status-legend__value">{valor.toLocaleString("pt-BR")}</span>
          </>
        );
        return (
          <li key={s.chave}>
            {linkPara ? (
              <Link to={linkPara(s)} className="status-legend__item" data-status={s.chave}>
                {conteudo}
              </Link>
            ) : (
              <span className="status-legend__item" data-status={s.chave}>
                {conteudo}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
