import Microarea from "./models/microarea";
import User from "./models/user";
import { HttpError, equipesAceitas } from "./http";
import { EQUIPES } from "./constantes";
import { lerListaCeps } from "@/utils/agendamento";
import { mascaraCEP, rotuloMicroarea, somenteDigitos } from "@/utils/formatos";

/** Microárea que cobre o CEP (ou null se o CEP está fora do território). */
export async function microareaDoCep(cep) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;
  return Microarea.findOne({ "ceps.cep": digitos });
}

/** Endereço cadastrado para o CEP dentro da microárea (ex.: "SQN 404 Bloco A"). */
export function enderecoDoCep(microarea, cep) {
  const digitos = somenteDigitos(cep);
  return microarea?.ceps.find((c) => c.cep === digitos)?.endereco || "";
}

/** ACS responsável pela microárea, se houver e ainda for agente da mesma equipe. */
export async function agenteDaMicroarea(microarea) {
  if (!microarea?.agente) return null;
  const agente = await User.findById(microarea.agente).select("_id nome role equipe");
  if (!agente || agente.role !== "agente" || agente.equipe !== microarea.equipe) return null;
  return agente;
}

/** CEPs da lista que já pertencem a outra microárea: [{ cep, equipe, numero }]. */
export async function cepsEmOutraMicroarea(ceps, ignorarId) {
  const lista = ceps.map((c) => c.cep);
  if (lista.length === 0) return [];
  const outras = await Microarea.find({ _id: { $ne: ignorarId }, "ceps.cep": { $in: lista } }).select("equipe numero ceps.cep");
  const conflitos = [];
  for (const m of outras) {
    for (const c of m.ceps) {
      if (lista.includes(c.cep)) conflitos.push({ cep: c.cep, equipe: m.equipe, numero: m.numero });
    }
  }
  return conflitos;
}

/** Valida e normaliza os dados de uma microárea enviados pelo supervisor. */
export async function dadosDaMicroarea(body, ignorarId) {
  const equipe = body.equipe;
  if (!EQUIPES.includes(equipe)) throw new HttpError(400, "Selecione a equipe");
  const numero = Number(body.numero);
  if (!Number.isInteger(numero) || numero < 1 || numero > 99) throw new HttpError(400, "O número da microárea vai de 1 a 99");

  let agente;
  if (body.agente) {
    const user = await User.findById(body.agente).catch(() => null);
    if (!user || user.role !== "agente" || !equipesAceitas(equipe).includes(user.equipe)) {
      throw new HttpError(400, "O ACS escolhido precisa ser agente da mesma equipe");
    }
    agente = user._id;
  }

  const { ceps, invalidas } = lerListaCeps(body.cepsTexto);
  if (invalidas.length > 0) {
    throw new HttpError(400, `Linha sem CEP válido: "${invalidas[0].slice(0, 60)}". Cada linha precisa ter um CEP de 8 números.`);
  }
  const conflitos = await cepsEmOutraMicroarea(ceps, ignorarId);
  if (conflitos.length > 0) {
    const c = conflitos[0];
    const mais = conflitos.length > 1 ? ` e mais ${conflitos.length - 1}` : "";
    throw new HttpError(400, `O CEP ${mascaraCEP(c.cep)}${mais} já pertence à equipe ${c.equipe}, ${rotuloMicroarea(c.numero).toLowerCase()}.`);
  }

  return {
    equipe,
    numero,
    descricao: String(body.descricao || "").trim().slice(0, 500),
    agente: agente || null,
    ceps,
  };
}

