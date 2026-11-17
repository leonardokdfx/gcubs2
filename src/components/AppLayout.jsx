"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "../lib/router";
import { House, Users, ChartColumn, Settings, LogOut, UserRound, ChevronDown, UserCog, CalendarPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { equipesDoUsuario, rotuloPapel } from "../constants/dominio";
import { Avatar, BrandMark } from "./ui";
import { useToast } from "./feedback";

const INICIO = { to: "/dashboard", label: "Início", Icone: House, ativo: (p) => p === "/dashboard" };
const PEDIDOS = { to: "/agendamentos", label: "Pedidos de cadastro", curto: "Pedidos", Icone: CalendarPlus, ativo: (p) => p.startsWith("/agendamentos") };
const RELATORIOS = { to: "/relatorios", label: "Relatórios", Icone: ChartColumn, ativo: (p) => p.startsWith("/relatorios") };
const USUARIOS = { to: "/config/usuarios", label: "Usuários", Icone: UserCog, ativo: (p) => p.startsWith("/config/usuarios") };
const CONFIG = {
  to: "/config",
  label: "Configurações",
  curto: "Ajustes",
  Icone: Settings,
  ativo: (p) => (p.startsWith("/config") && !p.startsWith("/config/usuarios")) || p.startsWith("/perfil"),
};

function NavItem({ item, pathname, className, curto = false }) {
  const atual = item.ativo(pathname);
  return (
    <Link to={item.to} className={`${className}${atual ? " active" : ""}`} aria-current={atual ? "page" : undefined}>
      <item.Icone aria-hidden="true" />
      {curto && item.curto ? item.curto : item.label}
    </Link>
  );
}

function MenuUsuario() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const botao = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) setAberto(false);
    };
    const tecla = (e) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const sair = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="topbar__user" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="user-button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? "menu-usuario" : undefined}
        onClick={() => setAberto((v) => !v)}
      >
        <span className="user-button__text">
          <span className="user-button__name">{user?.nome}</span>
          <span className="user-button__meta">{rotuloPapel(user)}</span>
        </span>
        <Avatar nome={user?.nome} foto={user?.foto} />
        <ChevronDown className="user-button__chevron" aria-hidden="true" />
        <span className="sr-only">Menu do usuário</span>
      </button>

      {aberto && (
        <div className="menu" id="menu-usuario" role="menu" aria-label="Menu do usuário">
          <div className="menu__header" role="presentation">
            <div className="menu__name">{user?.nome}</div>
            <div className="menu__meta">{user?.email}</div>
            <div className="menu__meta">{rotuloPapel(user)}</div>
          </div>
          <Link to="/perfil" className="menu__item" role="menuitem" onClick={() => setAberto(false)}>
            <UserRound aria-hidden="true" />
            Meu perfil
          </Link>
          <Link to="/config" className="menu__item" role="menuitem" onClick={() => setAberto(false)}>
            <Settings aria-hidden="true" />
            Configurações
          </Link>
          <button type="button" className="menu__item menu__item--danger" role="menuitem" onClick={sair}>
            <LogOut aria-hidden="true" />
            Sair do sistema
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Estrutura comum das telas autenticadas:
 * barra superior + navegação lateral (desktop) ou inferior (celular).
 * `semNavInferior` esconde a navegação inferior no celular em telas de
 * formulário, deixando espaço para a barra de ações fixa.
 */
function AppLayout({ children, semNavInferior = false, estreito = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname: caminhoBruto } = useLocation();
  const pathname = decodeURIComponent(caminhoBruto);
  const toast = useToast();
  const supervisor = user?.role === "supervisor";
  const equipes = equipesDoUsuario(user);

  const minhaEquipe = !supervisor && user?.equipe
    ? {
        to: `/equipe/${encodeURIComponent(user.equipe)}`,
        label: "Pacientes",
        Icone: Users,
        ativo: (p) => p.startsWith("/equipe/"),
      }
    : null;

  const itensInferiores = [INICIO, minhaEquipe, PEDIDOS, RELATORIOS, supervisor ? USUARIOS : null, CONFIG].filter(Boolean);
  const itensGestao = [RELATORIOS, supervisor ? USUARIOS : null, CONFIG].filter(Boolean);

  useEffect(() => {
    toast.setLayout({ semNav: semNavInferior, comBarraAcoes: semNavInferior });
  }, [semNavInferior, toast]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [caminhoBruto]);

  const sair = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="topbar">
        <Link to="/dashboard" className="brand" aria-label="Visitas Domiciliares, ir para o início">
          <BrandMark />
          <span className="brand__name">Visitas Domiciliares</span>
        </Link>
        <span className="topbar__spacer" />
        <MenuUsuario />
      </header>

      <nav className="sidenav" aria-label="Menu principal">
        <ul className="nav-list">
          <li>
            <NavItem item={INICIO} pathname={pathname} className="nav-link" />
          </li>
          <li>
            <NavItem item={PEDIDOS} pathname={pathname} className="nav-link" />
          </li>
        </ul>

        {equipes.length > 0 && (
          <div className="nav-group">
            <div className="nav-group__label" id="nav-equipes">
              {supervisor ? "Equipes" : "Minha equipe"}
            </div>
            <ul className="nav-list" aria-labelledby="nav-equipes">
              {equipes.map((equipe) => {
                const item = {
                  to: `/equipe/${encodeURIComponent(equipe.nome)}`,
                  label: `Equipe ${equipe.nome}`,
                  Icone: equipe.Icone,
                  ativo: (p) => p === `/equipe/${equipe.nome}` || p.startsWith(`/equipe/${equipe.nome}/`),
                };
                return (
                  <li key={equipe.nome}>
                    <NavItem item={item} pathname={pathname} className="nav-link" />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="nav-group">
          <div className="nav-group__label" id="nav-gestao">
            Gestão
          </div>
          <ul className="nav-list" aria-labelledby="nav-gestao">
            {itensGestao.map((item) => (
              <li key={item.to}>
                <NavItem item={item} pathname={pathname} className="nav-link" />
              </li>
            ))}
          </ul>
        </div>

        <div className="sidenav__footer">
          <ul className="nav-list">
            <li>
              <button type="button" className="nav-link nav-link--danger nav-link--button" onClick={sair}>
                <LogOut aria-hidden="true" />
                Sair do sistema
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="main-shell">
        <main
          id="conteudo"
          className={`main${semNavInferior ? " main--no-nav" : ""}${estreito ? " main--narrow" : ""}`}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {!semNavInferior && (
        <nav className="bottomnav" aria-label="Navegação principal">
          {itensInferiores.map((item) => (
            <NavItem key={item.to} item={item} pathname={pathname} className="bottomnav__link" curto />
          ))}
        </nav>
      )}
    </div>
  );
}

export default AppLayout;
