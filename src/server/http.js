import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { conectar } from "./db";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const json = (data, status = 200) => NextResponse.json(data, { status });

function segredo() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não definido nas variáveis de ambiente.");
  }
  return process.env.JWT_SECRET;
}

export function assinarToken(payload, expiresIn = "8h") {
  return jwt.sign(payload, segredo(), { expiresIn });
}

/** Lê e valida o token JWT do header Authorization. Retorna null se ausente. */
export function lerToken(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.split(" ")[1], segredo());
  } catch {
    throw new HttpError(401, "Token inválido ou expirado");
  }
}

/** Exige um usuário autenticado (equivalente ao middleware `autenticar`). */
export function autenticar(req) {
  const user = lerToken(req);
  if (!user) throw new HttpError(401, "Token não fornecido");
  return user;
}

export function apenasSupervisor(user) {
  if (!user || user.role !== "supervisor") {
    throw new HttpError(403, "Acesso restrito ao supervisor");
  }
}

export async function lerCorpo(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/**
 * Envolve um handler de rota: conecta ao banco, resolve os params
 * e converte erros em respostas JSON.
 */
export function rota(handler) {
  return async (req, ctx) => {
    try {
      await conectar();
      const params = ctx?.params ? await ctx.params : {};
      const decodificados = {};
      for (const [k, v] of Object.entries(params)) {
        try {
          decodificados[k] = decodeURIComponent(v);
        } catch {
          decodificados[k] = v;
        }
      }
      return await handler(req, decodificados);
    } catch (err) {
      if (err instanceof HttpError) return json({ message: err.message }, err.status);
      console.error(err);
      return json({ message: "Erro interno do servidor", error: err.message }, 500);
    }
  };
}

export function normalizarEquipe(equipe) {
  return String(equipe || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function equipesAceitas(equipe) {
  return normalizarEquipe(equipe) === "agua" ? ["Água", "Agua"] : [equipe];
}

/** Agente só acessa a própria equipe; supervisor acessa todas. */
export function podeAcessarEquipe(user, equipe) {
  if (user.role === "supervisor") return true;
  return normalizarEquipe(user.equipe) === normalizarEquipe(equipe);
}
