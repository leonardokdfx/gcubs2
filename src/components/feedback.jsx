"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, Ban, Info, X, TriangleAlert } from "lucide-react";
import { Button } from "./ui";

/* ───────────── Avisos rápidos (toast) ───────────── */
const ToastContext = createContext(null);
const ICONES = { success: CircleCheck, danger: Ban, info: Info };

let proximoId = 1;

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [layout, setLayout] = useState({ semNav: false, comBarraAcoes: false });
  const timers = useRef(new Map());

  const fechar = useCallback((id) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const mostrar = useCallback(
    (mensagem, tipo = "success", duracao = 4500) => {
      const id = proximoId++;
      setAvisos((lista) => [...lista.slice(-2), { id, mensagem, tipo }]);
      timers.current.set(
        id,
        setTimeout(() => fechar(id), duracao)
      );
    },
    [fechar]
  );

  useEffect(() => {
    const mapa = timers.current;
    return () => mapa.forEach((t) => clearTimeout(t));
  }, []);

  const valor = useMemo(
    () => ({
      sucesso: (m) => mostrar(m, "success"),
      erro: (m) => mostrar(m, "danger", 7000),
      info: (m) => mostrar(m, "info"),
      setLayout,
    }),
    [mostrar]
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        className="toast-region"
        data-no-nav={layout.semNav || undefined}
        data-has-action-bar={layout.comBarraAcoes || undefined}
        aria-live="polite"
        aria-atomic="false"
      >
        {avisos.map((a) => {
          const Icone = ICONES[a.tipo] || Info;
          return (
            <div key={a.id} className={`toast toast--${a.tipo}`} role={a.tipo === "danger" ? "alert" : "status"}>
              <Icone className="toast__icon" aria-hidden="true" />
              <span className="toast__text">{a.mensagem}</span>
              <button type="button" className="toast__close" onClick={() => fechar(a.id)} aria-label="Fechar aviso">
                <X aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}

/* ───────────── Diálogo de confirmação ───────────── */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const idTitulo = "confirm-dialog-title";
  const idTexto = "confirm-dialog-text";

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={idTitulo}
      aria-describedby={idTexto}
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !loading) onCancel();
      }}
    >
      <div className="dialog__body">
        {danger && (
          <span className="dialog__icon" aria-hidden="true">
            <TriangleAlert />
          </span>
        )}
        <div>
          <h2 className="dialog__title" id={idTitulo}>
            {title}
          </h2>
          <div className="dialog__text" id={idTexto}>
            {children}
          </div>
        </div>
      </div>
      <div className="dialog__footer">
        <Button onClick={onCancel} disabled={loading} autoFocus>
          {cancelLabel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading} loadingText="Aguarde…">
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

/* ───────────── Diálogo com formulário ───────────── */
export function FormDialog({ open, title, description, children, submitLabel = "Salvar", danger = false, loading = false, wide = false, extraAction, onSubmit, onCancel }) {
  const ref = useRef(null);
  const idTitulo = React.useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog${wide ? " dialog--wide" : ""}`}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="dialog__body" style={{ display: "block" }}>
          <h2 className="dialog__title" id={idTitulo}>
            {title}
          </h2>
          {description && <div className="dialog__text">{description}</div>}
          <div className="stack" style={{ marginTop: 16, gap: 16 }}>
            {open && children}
          </div>
        </div>
        <div className="dialog__footer">
          {extraAction}
          <Button onClick={onCancel} disabled={loading}>
            Voltar
          </Button>
          <Button type="submit" variant={danger ? "danger" : "primary"} loading={loading} loadingText="Aguarde…">
            {submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
