"use client";

import React from "react";
import { EQUIPES } from "../constants/dominio";
import { BrandMark } from "./ui";

/** Layout das telas de acesso (login e configuração inicial). */
function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <div className="auth__brand">
          <BrandMark />
          <span className="auth__name">Visitas Domiciliares</span>
        </div>
        <div className="auth__intro">
          <p className="auth__lead">
            Registro e acompanhamento das visitas domiciliares dos Agentes Comunitários de Saúde, por equipe.
          </p>
          <div className="auth__teams">
            <p className="auth__teams-label">Equipes da unidade</p>
            <ul className="auth__teams-list">
              {EQUIPES.map(({ nome, Icone }) => (
                <li key={nome}>
                  <Icone aria-hidden="true" />
                  {nome}
                </li>
              ))}
            </ul>
          </div>
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
