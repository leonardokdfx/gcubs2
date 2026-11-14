"use client";

import React from "react";
import { Navigate } from "../lib/router";
import { useAuth } from "./AuthContext";
import { BrandMark, Spinner } from "../components/ui";

/**
 * Bloqueia o acesso a rotas até confirmar que existe uma sessão válida.
 * Uso: <ProtectedRoute apenasSupervisor><Dashboard /></ProtectedRoute>
 */
function ProtectedRoute({ children, apenasSupervisor = false }) {
  const { user, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="page-loading" role="status">
        <BrandMark />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Spinner />
          Carregando…
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (apenasSupervisor && user.role !== "supervisor") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
