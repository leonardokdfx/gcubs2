"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { Link } from "../lib/router";
import { BrandMark } from "./ui";
import { ENDERECO_UNIDADE, MAPA_UNIDADE, UNIDADE } from "../constants/unidade";

/** Estrutura das telas públicas do paciente: barra superior simples, sem login e sem menu da equipe. */
function PortalLayout({ children }) {
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <Link to="/paciente" className="brand" aria-label={`${UNIDADE.nome}, área do paciente, ir para o início`}>
          <BrandMark />
          <span className="brand__texto">
            <span className="brand__name">{UNIDADE.nome}</span>
            <span className="brand__sub">Área do paciente</span>
          </span>
        </Link>
        <span className="topbar__spacer" />
        <Link to="/" className="btn btn--ghost btn--sm">
          Acesso da equipe
        </Link>
      </header>
      <main id="conteudo" className="main main--narrow main--portal" tabIndex={-1}>
        {children}
      </main>
      <footer className="unidade-rodape">
        <div className="unidade-rodape__conteudo">
          <MapPin aria-hidden="true" />
          <address>
            <strong>{UNIDADE.nome}</strong>
            <span>{ENDERECO_UNIDADE}</span>
            <a href={MAPA_UNIDADE} target="_blank" rel="noopener noreferrer">
              Ver no mapa<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </address>
        </div>
      </footer>
    </div>
  );
}

export default PortalLayout;
