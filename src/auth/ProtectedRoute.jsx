"use client";

import React from "react";
import { Navigate } from "../lib/router";
import { useAuth } from "./AuthContext";
import { useEquipes } from "./EquipesContext";
import { BrandMark, Spinner } from "../components/ui";

/**
 * Bloqueia o acesso a rotas até confirmar que existe uma sessão válida.
 * Uso: <ProtectedRoute apenasSupervisor><Dashboard /></ProtectedRoute>
 */
function ProtectedRoute({ children, apenasSupervisor = false, permitirSetor = false }) {
  const { user, carregando } = useAuth();
  const { carregado: equipesCarregadas } = useEquipes();

  if (carregando || !equipesCarregadas) {
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

  // Conta de setor (farmácia, laboratório…) só vê o funcionamento da unidade e o próprio perfil.
  if (user.role === "setor" && !permitirSetor) {
    return <Navigate to="/setor" replace />;
  }

  if (apenasSupervisor && user.role !== "supervisor") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
