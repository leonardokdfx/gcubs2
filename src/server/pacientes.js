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

// Campos da ficha que as telas podem gravar. Qualquer outro campo do corpo da requisição
// (criadoPor, datas de controle, operadores do MongoDB como "$set") é descartado (R-06).
const CAMPOS_EDITAVEIS = [
  "dataHoje", "responsavel", "nome", "cpf", "telefone", "outroTelefone", "dataNascimento", "cns",
  "cep", "endereco", "numero", "pontoReferencia", "trabalhador", "enderecoMoradia", "melhorHorario",
  "moradoresHomens", "moradoresMulheres", "moradoresCriancas", "gruposAtencao", "numeroSES",
  "observacao", "equipe", "microarea", "status",
];

const valorSimples = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);

/**
 * Copia do corpo só os campos permitidos, com valores simples (texto, número, data em texto)
 * ou, em gruposAtencao, uma lista de textos. Objetos são recusados, o que impede injetar
 * operadores do banco pela requisição.
 */
export function camposPaciente(body = {}) {
  const dados = {};
  for (const campo of CAMPOS_EDITAVEIS) {
    if (!(campo in body)) continue;
    const valor = body[campo];
    if (campo === "gruposAtencao") {
      if (!Array.isArray(valor) || !valor.every((g) => typeof g === "string")) continue;
      dados[campo] = valor;
    } else if (valorSimples(valor)) {
      dados[campo] = typeof valor === "string" ? valor.slice(0, campo === "observacao" ? 2000 : 300) : valor;
    }
  }
  return dados;
}
