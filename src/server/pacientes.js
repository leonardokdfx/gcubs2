import User from "./models/user";
import { equipesAceitas } from "./http";

/** O responsável precisa ser um agente cadastrado na equipe do paciente. */
export async function responsavelValido(nome, equipe) {
  return User.findOne({
    nome: String(nome || "").trim(),
    role: "agente",
    equipe: { $in: equipesAceitas(equipe) },
  });
}
