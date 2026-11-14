import { assinarToken } from "./http";

export function gerarToken(user) {
  return assinarToken({
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    equipe: user.equipe || null,
  });
}

export function sanitizarUser(user) {
  return {
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    equipe: user.equipe || null,
    foto: user.foto || null,
  };
}
