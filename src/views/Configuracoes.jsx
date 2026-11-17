"use client";

import React from "react";
import { Link, useNavigate } from "../lib/router";
import { ChevronRight, LogOut, UserRound, UserCog, MapPinned } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { PageHeader } from "../components/ui";

function Configuracoes() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const supervisor = user?.role === "supervisor";

  const opcoes = [
    {
      titulo: "Meu perfil",
      descricao: "Nome, e-mail, foto e senha de acesso.",
      Icone: UserRound,
      to: "/perfil",
    },
    supervisor && {
      titulo: "Gerenciar usuários",
      descricao: "Cadastre agentes e supervisores e vincule cada agente à sua equipe.",
      Icone: UserCog,
      to: "/config/usuarios",
    },
    supervisor && {
      titulo: "Território",
      descricao: "Microáreas, ACS responsável e CEPs atendidos. Define quem pode pedir cadastro pela área do paciente.",
      Icone: MapPinned,
      to: "/config/territorio",
    },
  ].filter(Boolean);

  const sair = () => {
    logout();
    navigate("/");
  };

  return (
    <AppLayout estreito>
      <PageHeader title="Configurações" description="Sua conta e a administração do sistema." />

      <div className="paper">
        <ul className="option-list">
          {opcoes.map((op) => (
            <li key={op.to}>
              <Link to={op.to} className="option">
                <span className="option__icon" aria-hidden="true">
                  <op.Icone />
                </span>
                <span className="option__text">
                  <span className="option__title">{op.titulo}</span>
                  <span className="option__description">{op.descricao}</span>
                </span>
                <ChevronRight className="option__chevron" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <button type="button" className="option option--danger" onClick={sair}>
              <span className="option__icon" aria-hidden="true">
                <LogOut />
              </span>
              <span className="option__text">
                <span className="option__title">Sair do sistema</span>
                <span className="option__description">Encerra a sessão neste aparelho.</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </AppLayout>
  );
}

export default Configuracoes;
