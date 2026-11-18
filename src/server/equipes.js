import Equipe from "./models/equipe";
import Paciente from "./models/paciente";
import User from "./models/user";
import Agendamento from "./models/agendamento";
import Microarea from "./models/microarea";
import Presenca from "./models/presenca";
import AvisoConsulta from "./models/avisoConsulta";
import { HttpError } from "./http";
import { CHAVES_ICONES_EQUIPE, EQUIPES_INICIAIS, chaveEquipe } from "@/utils/equipes";
import { EM_ANDAMENTO } from "@/utils/agendamento";
import { rotuloMicroarea } from "@/utils/formatos";

// Lista em memória por alguns segundos: quase toda rota valida a equipe.
let cache = null;
let cacheEm = 0;
const VALIDADE_CACHE_MS = 30000;
export const limparCacheEquipes = () => {
  cache = null;
};

/** Todas as equipes, em ordem. Na primeira vez cria as equipes que o sistema já usava. */
export async function listarEquipes() {
  if (cache && Date.now() - cacheEm < VALIDADE_CACHE_MS) return cache;
  let docs = await Equipe.find().sort({ ordem: 1, nome: 1 }).lean();
  if (docs.length === 0) {
    try {
      await Equipe.insertMany(EQUIPES_INICIAIS.map((e, i) => ({ ...e, ordem: i })), { ordered: false });
    } catch (err) {
      if (err.code !== 11000 && !err.writeErrors) throw err; // outra requisição criou ao mesmo tempo
    }
    docs = await Equipe.find().sort({ ordem: 1, nome: 1 }).lean();
  }
  cache = docs;
  cacheEm = Date.now();
  return docs;
}

export async function nomesEquipes() {
  return (await listarEquipes()).map((e) => e.nome);
}

/** Nome oficial da equipe (aceita "agua" para "Água"), ou null se não existe. */
export async function nomeDaEquipe(nome) {
  const chave = chaveEquipe(nome);
  if (!chave) return null;
  return (await listarEquipes()).find((e) => chaveEquipe(e.nome) === chave)?.nome || null;
}

export async function equipeExiste(nome) {
  return (await nomeDaEquipe(nome)) !== null;
}

/** Nomes gravados que pertencem à equipe (inclui grafia antiga sem acento, ex.: "Agua"). */
function grafias(nome) {
  const semAcento = String(nome).normalize("NFD").replace(/[̀-ͯ]/g, "");
  return [...new Set([nome, semAcento])];
}

/** Quanto cada equipe tem vinculado: { [nome]: { pacientes, agentes, microareas, pedidos } }. */
export async function vinculosDasEquipes(equipes) {
  const contar = async (Modelo, filtro = {}) => {
    const linhas = await Modelo.aggregate([{ $match: filtro }, { $group: { _id: "$equipe", total: { $sum: 1 } } }]);
    const porChave = {};
    for (const l of linhas) porChave[chaveEquipe(l._id)] = (porChave[chaveEquipe(l._id)] || 0) + l.total;
    return porChave;
  };
  const [pacientes, agentes, microareas, pedidos] = await Promise.all([
    contar(Paciente),
    contar(User, { role: "agente" }),
    contar(Microarea),
    contar(Agendamento, { situacao: { $in: EM_ANDAMENTO } }),
  ]);
  return Object.fromEntries(
    equipes.map((e) => {
      const c = chaveEquipe(e.nome);
      return [e.nome, { pacientes: pacientes[c] || 0, agentes: agentes[c] || 0, microareas: microareas[c] || 0, pedidos: pedidos[c] || 0 }];
    })
  );
}

const temVinculo = (v) => v.pacientes + v.agentes + v.microareas + v.pedidos > 0;

async function validarDados(body, ignorarId) {
  const nome = String(body.nome ?? "").trim().replace(/\s+/g, " ");
  if (!nome) throw new HttpError(400, "Informe o nome da equipe");
  if (nome.length > 30) throw new HttpError(400, "O nome da equipe pode ter até 30 letras");
  if (/[/\\?#%]/.test(nome)) throw new HttpError(400, "O nome da equipe não pode ter / \\ ? # ou %");
  const icone = CHAVES_ICONES_EQUIPE.includes(body.icone) ? body.icone : "vento";
  const repetida = (await Equipe.find().lean()).find((e) => String(e._id) !== String(ignorarId) && chaveEquipe(e.nome) === chaveEquipe(nome));
  if (repetida) throw new HttpError(400, `Já existe a equipe ${repetida.nome}`);
  return { nome, icone };
}

export async function criarEquipe(body) {
  const dados = await validarDados(body);
  const total = await Equipe.countDocuments();
  const equipe = await new Equipe({ ...dados, ordem: total }).save();
  limparCacheEquipes();
  return equipe;
}

/** Troca o nome da equipe em todos os cadastros que guardam o nome. */
async function moverRegistros(de, para, { juntar }) {
  const filtro = { equipe: { $in: grafias(de) } };
  const mudar = { $set: { equipe: para } };
  await Promise.all([
    Paciente.updateMany(filtro, mudar),
    User.updateMany(filtro, mudar),
    Agendamento.updateMany(filtro, mudar),
    Microarea.updateMany(filtro, mudar),
    AvisoConsulta.updateMany(filtro, mudar),
    // Presença do médico/enfermeiro é da equipe que deixa de existir: ao juntar, não vale para a outra.
    juntar ? Presenca.deleteMany(filtro) : Presenca.updateMany(filtro, mudar),
  ]);
}

export async function editarEquipe(id, body) {
  const equipe = await Equipe.findById(id).catch(() => null);
  if (!equipe) throw new HttpError(404, "Equipe não encontrada");
  const dados = await validarDados(body, equipe._id);
  const antigo = equipe.nome;
  equipe.nome = dados.nome;
  equipe.icone = dados.icone;
  await equipe.save();
  if (antigo !== dados.nome) await moverRegistros(antigo, dados.nome, { juntar: false });
  limparCacheEquipes();
  return { equipe, renomeada: antigo !== dados.nome, antigo };
}

/**
 * Exclui a equipe. Se ela tem pacientes, ACS, microáreas ou pedidos, é preciso escolher
 * para qual equipe eles vão (`moverPara`). Microáreas com o mesmo número nas duas equipes
 * precisam ser renumeradas antes, em Território.
 */
export async function excluirEquipe(id, moverPara) {
  const equipe = await Equipe.findById(id).catch(() => null);
  if (!equipe) throw new HttpError(404, "Equipe não encontrada");
  if ((await Equipe.countDocuments()) <= 1) throw new HttpError(400, "O sistema precisa ter pelo menos uma equipe");

  const vinculos = (await vinculosDasEquipes([equipe]))[equipe.nome];
  let destino = null;
  if (temVinculo(vinculos)) {
    if (!moverPara) {
      throw Object.assign(new HttpError(409, `A equipe ${equipe.nome} tem cadastros vinculados. Escolha para qual equipe eles vão.`), { vinculos });
    }
    destino = await nomeDaEquipe(moverPara);
    if (!destino) throw new HttpError(400, "Equipe de destino não encontrada");
    if (chaveEquipe(destino) === chaveEquipe(equipe.nome)) throw new HttpError(400, "Escolha outra equipe para receber os cadastros");

    const deOrigem = await Microarea.find({ equipe: { $in: grafias(equipe.nome) } }).select("numero").lean();
    const noDestino = await Microarea.find({ equipe: { $in: grafias(destino) }, numero: { $in: deOrigem.map((m) => m.numero) } }).select("numero").lean();
    if (noDestino.length > 0) {
      const lista = noDestino.map((m) => rotuloMicroarea(m.numero).toLowerCase()).join(", ");
      throw new HttpError(409, `As duas equipes têm ${lista}. Renumere as microáreas da equipe ${equipe.nome} em Configurações › Território antes de juntar.`);
    }
    await moverRegistros(equipe.nome, destino, { juntar: true });
  } else {
    await Presenca.deleteMany({ equipe: { $in: grafias(equipe.nome) } });
  }

  await equipe.deleteOne();
  limparCacheEquipes();
  return { nome: equipe.nome, destino, vinculos };
}
