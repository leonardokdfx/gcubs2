import { assinarToken } from "./http";

export function gerarToken(user) {
  return assinarToken({
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    equipe: user.equipe || null,
    setores: user.role === "setor" ? user.setores || [] : undefined,
  });
}

export function sanitizarUser(user) {
  return {
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    equipe: user.equipe || null,
    setores: user.role === "setor" ? user.setores || [] : undefined,
    foto: user.foto || null,
  };
}
