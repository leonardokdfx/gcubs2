"use client";

import React, { Suspense } from "react";
import ProtectedRoute from "../auth/ProtectedRoute";

/**
 * Envolve cada tela: Suspense (exigido pelo Next para hooks de URL)
 * e, quando `protegida`, a checagem de sessão.
 */
export default function Pagina({ children, protegida = false, apenasSupervisor = false }) {
  const conteudo = protegida ? (
    <ProtectedRoute apenasSupervisor={apenasSupervisor}>{children}</ProtectedRoute>
  ) : (
    children
  );
  return <Suspense fallback={null}>{conteudo}</Suspense>;
}
