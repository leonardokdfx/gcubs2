"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { EQUIPES, definirEquipes } from "../constants/dominio";

const EquipesContext = createContext(null);

/**
 * Carrega as equipes da unidade (públicas: nome e ícone) uma vez ao abrir o app e
 * atualiza as listas de src/constants/dominio.js. As telas internas esperam este carregamento
 * (ver ProtectedRoute), então todo o sistema enxerga as equipes que o supervisor cadastrou.
 */
export function EquipesProvider({ children }) {
  const [versao, setVersao] = useState(0);
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(
    () =>
      api
        .get("/equipes", { auth: false })
        .then((lista) => {
          if (Array.isArray(lista) && lista.length > 0) definirEquipes(lista);
          setVersao((v) => v + 1);
        })
        .catch(() => {}) // sem rede: segue com a última lista conhecida
        .finally(() => setCarregado(true)),
    []
  );

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return <EquipesContext.Provider value={{ equipes: EQUIPES, versao, carregado, recarregar }}>{children}</EquipesContext.Provider>;
}

export function useEquipes() {
  const ctx = useContext(EquipesContext);
  if (!ctx) throw new Error("useEquipes precisa estar dentro de <EquipesProvider>");
  return ctx;
}
