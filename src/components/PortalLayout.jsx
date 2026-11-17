"use client";

import React from "react";
import { Link } from "../lib/router";
import { BrandMark } from "./ui";

/** Estrutura das telas públicas do paciente: barra superior simples, sem login e sem menu da equipe. */
function PortalLayout({ children }) {
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <Link to="/paciente" className="brand" aria-label="Área do paciente, ir para o início">
          <BrandMark />
          <span className="brand__name">Área do paciente</span>
        </Link>
        <span className="topbar__spacer" />
        <Link to="/" className="btn btn--ghost btn--sm">
          Acesso da equipe
        </Link>
      </header>
      <main id="conteudo" className="main main--narrow main--portal" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

export default PortalLayout;
