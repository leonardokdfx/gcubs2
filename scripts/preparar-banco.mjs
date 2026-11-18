// Cria no MongoDB as coleções e os índices de todos os modelos do sistema.
// Não apaga nada: coleções e índices que já existem ficam como estão.
//
// Uso (na pasta web):
//   npm run db:verificar   → só mostra o que existe e o que falta (não grava)
//   npm run db:preparar    → cria o que falta
import { register } from "node:module";
import mongoose from "mongoose";

// Os modelos usam o atalho "@/" do Next.js; o resolvedor traduz para src/.
register("./resolver-alias.mjs", import.meta.url);
const modelo = async (nome) => (await import(`../src/server/models/${nome}.js`)).default;

const MODELOS = [
  await modelo("user"),
  await modelo("paciente"),
  await modelo("agendamento"),
  await modelo("microarea"),
  await modelo("setor"),
  await modelo("equipe"),
  await modelo("presenca"),
  await modelo("avisoConsulta"),
];
const soVerificar = process.argv.includes("--verificar");

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI não definido. Rode com: node --env-file=.env.local scripts/preparar-banco.mjs");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, autoIndex: false });
const db = mongoose.connection.db;
console.log(`Banco: ${db.databaseName}${soVerificar ? " (só verificação, nada será gravado)" : ""}\n`);

const existentes = new Set((await db.listCollections().toArray()).map((c) => c.name));
let problemas = 0;

for (const Modelo of MODELOS) {
  const nome = Modelo.collection.collectionName;
  const existe = existentes.has(nome);
  const total = existe ? await db.collection(nome).estimatedDocumentCount() : 0;
  const esperados = Modelo.schema.indexes().map(([campos, opcoes]) => ({ campos, unique: !!opcoes?.unique }));
  // Índices declarados direto no campo (ex.: cpf: { unique: true }) também entram em schema.indexes().
  const atuais = existe ? await db.collection(nome).indexes() : [];
  const chave = (c) => JSON.stringify(c);
  const faltando = esperados.filter((e) => !atuais.some((a) => chave(a.key) === chave(e.campos)));

  console.log(`• ${Modelo.modelName} → coleção "${nome}": ${existe ? `existe, ${total} documento(s)` : "NÃO existe"}`);
  for (const f of faltando) console.log(`    falta índice ${chave(f.campos)}${f.unique ? " (único)" : ""}`);

  if (soVerificar) continue;

  try {
    if (!existe) await Modelo.createCollection();
    await Modelo.createIndexes();
    const depois = await db.collection(nome).indexes();
    console.log(`    ok: ${depois.length} índice(s)`);
  } catch (err) {
    problemas++;
    console.log(`    ERRO: ${err.message}`);
  }
}

const conhecidas = new Set(MODELOS.map((m) => m.collection.collectionName));
const sobrando = [...existentes].filter((n) => !conhecidas.has(n) && !n.startsWith("system."));
if (sobrando.length) {
  console.log(`\nColeções que o sistema não usa (não foram mexidas): ${sobrando.join(", ")}`);
}

await mongoose.disconnect();
console.log(problemas ? `\n${problemas} problema(s).` : "\nConcluído.");
process.exit(problemas ? 1 : 0);
