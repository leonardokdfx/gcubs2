"use client";

import React from "react";
import { EQUIPES } from "../constants/dominio";
import { BrandMark } from "./ui";
import { ENDERECO_UNIDADE, UNIDADE } from "../constants/unidade";

/** Layout das telas de acesso (login e configuração inicial). */
function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  lead = "Registro e acompanhamento das visitas domiciliares dos Agentes Comunitários de Saúde, por equipe.",
  mostrarEquipes = true,
}) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__brand">
          <BrandMark />
          <span className="auth__name">Visitas Domiciliares</span>
        </div>
        <p className="auth__unidade">
          <strong>{UNIDADE.nome}</strong>
          <span>{ENDERECO_UNIDADE}</span>
        </p>
        <div className="auth__intro">
          <p className="auth__lead">{lead}</p>
          {mostrarEquipes && (
            <div className="auth__teams">
              <p className="auth__teams-label">Equipes da {UNIDADE.nome}</p>
              <ul className="auth__teams-list">
                {EQUIPES.map(({ nome, Icone }) => (
                  <li key={nome}>
                    <Icone aria-hidden="true" />
                    {nome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__panel">
          <h1 className="auth__title">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
