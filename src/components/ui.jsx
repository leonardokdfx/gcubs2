"use client";

import React, { useId, useState } from "react";
import { Link } from "../lib/router";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  Ban,
  Eye,
  EyeOff,
  LoaderCircle,
  Minus,
  Plus,
  HouseHeart,
} from "lucide-react";
import { iniciais } from "../utils/formatos";
import { situacaoDe, SITUACOES } from "../constants/dominio";

/* ───────────── Marca ───────────── */
export function BrandMark({ size }) {
  return (
    <span className="brand-mark" style={size ? { "--mark-size": `${size}px` } : undefined} aria-hidden="true">
      <HouseHeart strokeWidth={2.1} />
    </span>
  );
}

/* ───────────── Spinner e botão ───────────── */
export function Spinner({ className = "", label }) {
  return (
    <>
      <LoaderCircle className={`spinner ${className}`} aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}

export function Button({
  variant,
  size,
  icon: Icone,
  loading = false,
  loadingText,
  block = false,
  className = "",
  children,
  type = "button",
  disabled,
  ...rest
}) {
  const classes = [
    "btn",
    variant && `btn--${variant}`,
    size && `btn--${size}`,
    block && "btn--block",
    !children && "btn--icon",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner /> : Icone && <Icone aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

export function ButtonLink({ to, variant, size, icon: Icone, block, className = "", children, ...rest }) {
  const classes = ["btn", variant && `btn--${variant}`, size && `btn--${size}`, block && "btn--block", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Link to={to} className={classes} {...rest}>
      {Icone && <Icone aria-hidden="true" />}
      {children}
    </Link>
  );
}

/* ───────────── Alerta ───────────── */
const ICONES_ALERTA = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: Ban };

export function Alert({ type = "info", title, children, action, className = "" }) {
  const Icone = ICONES_ALERTA[type];
  return (
    <div className={`alert alert--${type} ${className}`} role={type === "danger" ? "alert" : "status"}>
      <Icone className="alert__icon" aria-hidden="true" />
      <div className="alert__body">
        {title && <strong className="alert__title">{title}</strong>}
        {children}
      </div>
      {action && <div className="alert__action">{action}</div>}
    </div>
  );
}

/* ───────────── Cabeçalho de página ───────────── */
export function PageHeader({ breadcrumb, title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Você está em">
            <ol className="breadcrumb">
              {breadcrumb.map((item, i) => (
                <li key={item.label}>
                  {i > 0 && <ChevronRight aria-hidden="true" />}
                  {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

/* ───────────── Seção (papel com título) ───────────── */
export function Section({ title, description, actions, children, footer, className = "", bodyClassName = "", as: Tag = "section", ...rest }) {
  const idTitulo = useId();
  return (
    <Tag className={`paper section ${className}`} aria-labelledby={title ? idTitulo : undefined} {...rest}>
      {(title || actions) && (
        <div className="section__header">
          <div>
            {title && (
              <h2 className="section__title" id={idTitulo}>
                {title}
              </h2>
            )}
            {description && <p className="section__description">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={`section__body ${bodyClassName}`}>{children}</div>
      {footer && <div className="section__footer">{footer}</div>}
    </Tag>
  );
}

/* ───────────── Campo de formulário ───────────── */
export function Field({ label, required, optional, hint, error, className = "", children, htmlFor }) {
  const idGerado = useId();
  const id = htmlFor || idGerado;
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const descritoPor = [hint && idDica, error && idErro].filter(Boolean).join(" ") || undefined;

  const controle =
    typeof children === "function"
      ? children({ id, "aria-describedby": descritoPor, "aria-invalid": error ? true : undefined })
      : children;

  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="field__optional">(opcional)</span>}
      </label>
      {controle}
      {hint && !error && (
        <p className="field__hint" id={idDica}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={idErro}>
          <CircleAlert aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ───────────── Senha com mostrar/ocultar ───────────── */
export function PasswordInput({ id, className = "", ...rest }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="input-wrap input-wrap--action">
      <input id={id} type={visivel ? "text" : "password"} className={`input ${className}`} {...rest} />
      <button
        type="button"
        className="input-wrap__action"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        aria-controls={id}
      >
        {visivel ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}

/* ───────────── Stepper numérico ───────────── */
export function Stepper({ id, name, value, onChange, min = 0, max = 99, label, ...rest }) {
  const numero = Number(value) || 0;
  const definir = (novo) => {
    const limitado = Math.max(min, Math.min(max, novo));
    onChange({ target: { name, value: limitado, type: "number" } });
  };
  return (
    <div className="stepper">
      <button type="button" onClick={() => definir(numero - 1)} disabled={numero <= min} aria-label={`Diminuir ${label}`}>
        <Minus aria-hidden="true" />
      </button>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange({ target: { name, value: e.target.value === "" ? "" : Number(e.target.value), type: "number" } })}
        {...rest}
      />
      <button type="button" onClick={() => definir(numero + 1)} disabled={numero >= max} aria-label={`Aumentar ${label}`}>
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

/* ───────────── Avatar ───────────── */
export function Avatar({ nome, foto, size }) {
  const [falhou, setFalhou] = useState(false);
  const estilo = size ? { "--avatar-size": `${size}px` } : undefined;
  return (
    <span className="avatar" style={estilo} aria-hidden="true">
      {foto && !falhou ? <img src={foto} alt="" onError={() => setFalhou(true)} /> : iniciais(nome)}
    </span>
  );
}

/* ───────────── Ícone de equipe ───────────── */
export function TeamIcon({ equipe, size }) {
  const Icone = equipe.Icone;
  return (
    <span className="team-icon" style={size ? { "--team-icon-size": `${size}px` } : undefined} aria-hidden="true">
      <Icone strokeWidth={2} />
    </span>
  );
}

/* ───────────── Situação da visita ───────────── */
export function StatusTag({ status }) {
  const s = situacaoDe(status);
  const Icone = s.Icone;
  return (
    <span className="tag" data-status={s.chave}>
      <Icone aria-hidden="true" />
      {s.rotulo}
    </span>
  );
}

export function StatusSelect({ status, onChange, disabled, label, id }) {
  const s = situacaoDe(status);
  const Icone = s.Icone;
  return (
    <div className="status-select" data-status={s.chave}>
      <Icone className="status-select__icon" aria-hidden="true" />
      <select id={id} value={s.valor} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={label}>
        {[SITUACOES[3], SITUACOES[0], SITUACOES[1], SITUACOES[2]].map((opcao) => (
          <option key={opcao.chave} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ───────────── Estado vazio ───────────── */
export function EmptyState({ icon: Icone, title, children, action }) {
  return (
    <div className="empty-state">
      {Icone && (
        <span className="empty-state__icon" aria-hidden="true">
          <Icone />
        </span>
      )}
      <p className="empty-state__title">{title}</p>
      {children && <p className="empty-state__text">{children}</p>}
      {action}
    </div>
  );
}

/* ───────────── Skeleton ───────────── */
export function Skeleton({ width = "100%", height = 14, style, className = "" }) {
  return <span className={`skeleton ${className}`} style={{ width, height, ...style }} aria-hidden="true" />;
}
