"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import api from "../services/api";
import { contarSituacoes, equipesDoUsuario } from "../constants/dominio";

/** true quando a media query casa (ex.: "(min-width: 960px)"). */
export function useMediaQuery(query) {
  const assinar = useCallback(
    (avisar) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", avisar);
      return () => mql.removeEventListener("change", avisar);
    },
    [query]
  );
  return useSyncExternalStore(assinar, () => window.matchMedia(query).matches, () => false);
}

export const useDesktop = () => useMediaQuery("(min-width: 960px)");

const somar = (lista) =>
  lista.reduce(
    (acc, item) => {
      for (const k of Object.keys(acc)) acc[k] += item.contagem[k];
      return acc;
    },
    { realizada: 0, ausente: 0, naomora: 0, pendente: 0, total: 0 }
  );

/**
 * Busca os pacientes de todas as equipes que o usuário pode ver
 * e devolve a contagem por situação de cada equipe e o total geral.
 */
export function useResumoEquipes(user) {
  const [estado, setEstado] = useState({ carregando: true, erro: "", porEquipe: [], pacientes: [] });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const equipes = equipesDoUsuario(user);
    if (equipes.length === 0) {
      setEstado({ carregando: false, erro: "", porEquipe: [], pacientes: [] });
      return undefined;
    }

    let ativo = true;
    setEstado((s) => ({ ...s, carregando: true, erro: "" }));
    Promise.all(equipes.map((e) => api.get(`/pacientes/${encodeURIComponent(e.nome)}`)))
      .then((respostas) => {
        if (!ativo) return;
        const porEquipe = equipes.map((equipe, i) => ({
          equipe,
          pacientes: respostas[i] || [],
          contagem: contarSituacoes(respostas[i] || []),
        }));
        setEstado({ carregando: false, erro: "", porEquipe, pacientes: respostas.flat() });
      })
      .catch((err) => {
        if (ativo) setEstado({ carregando: false, erro: err.message, porEquipe: [], pacientes: [] });
      });

    return () => {
      ativo = false;
    };
  }, [user, versao]);

  return {
    ...estado,
    geral: somar(estado.porEquipe),
    recarregar: () => setVersao((v) => v + 1),
  };
}
