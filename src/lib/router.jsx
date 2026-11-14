"use client";

// Camada de compatibilidade: expõe a mesma API do react-router-dom que as
// telas já usavam (Link, useNavigate, useParams, ...), implementada sobre o
// roteador do Next.js (App Router).
import React, { useCallback, useEffect } from "react";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

// "state" de navegação (equivalente ao location.state do react-router).
let estadoPendente = null;

function decodificar(valor) {
  if (typeof valor !== "string") return valor;
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

export const Link = React.forwardRef(function Link({ to, href, replace, state, onClick, ...rest }, ref) {
  return (
    <NextLink
      ref={ref}
      href={to ?? href}
      replace={replace}
      {...rest}
      onClick={(e) => {
        if (state !== undefined) estadoPendente = state;
        onClick?.(e);
      }}
    />
  );
});

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to, opcoes = {}) => {
      if (typeof to === "number") {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      estadoPendente = opcoes.state ?? null;
      if (opcoes.replace) router.replace(to);
      else router.push(to);
    },
    [router]
  );
}

export function Navigate({ to, replace = false }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);
  return null;
}

export function useParams() {
  const params = useNextParams() || {};
  const saida = {};
  for (const [k, v] of Object.entries(params)) saida[k] = decodificar(v);
  return saida;
}

export function useLocation() {
  const pathname = usePathname();
  const busca = useNextSearchParams();
  const [state] = React.useState(() => {
    const s = estadoPendente;
    estadoPendente = null;
    return s;
  });
  const search = busca?.toString() ? `?${busca.toString()}` : "";
  return { pathname, search, state };
}

export function useSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const busca = useNextSearchParams();
  const params = new URLSearchParams(busca?.toString() || "");

  const setSearchParams = useCallback(
    (novos, opcoes = {}) => {
      const qs = new URLSearchParams(novos).toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opcoes.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname]
  );

  return [params, setSearchParams];
}
