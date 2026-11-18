import mongoose from 'mongoose';

// Funcionamento de cada setor da unidade (um documento por setor).
// - horario/acesso: configurados pelo supervisor (valem toda semana).
// - hoje: o que o próprio setor informou no dia (situação, movimento, urgência). Só vale na data gravada:
//   no dia seguinte o portal volta a usar o horário, sem ninguém precisar "zerar".
// - faltas: remédios/vacinas em falta (continuam até o setor tirar da lista).
// Chaves e situações: ver src/utils/setores.js.
const CHAVES = ["farmacia", "laboratorio", "odontologia", "vacinacao", "ipe"];

const TurnoSchema = new mongoose.Schema({ abre: String, fecha: String }, { _id: false });
const FaltaSchema = new mongoose.Schema({ nome: { type: String, required: true }, desde: { type: Date, default: Date.now } }, { _id: false });

const SetorSchema = new mongoose.Schema({
  chave: { type: String, enum: CHAVES, required: true, unique: true },
  acesso: { type: String, maxlength: 300 }, // como funciona (ex.: "Coleta por ordem de chegada")
  horario: {
    dias: [{ type: Number, min: 0, max: 6 }], // 0 = domingo
    turnos: { type: [TurnoSchema], default: [] },
  },
  hoje: {
    data: { type: Date }, // meia-noite UTC do dia a que o registro se refere
    situacao: { type: String, enum: ["aberto", "encerrado", "fechado", "sem_atendimento", "disponivel", "realizado"] },
    motivo: { type: String },
    voltaAs: { type: String },
    recado: { type: String, maxlength: 140 },
    movimento: { type: String, enum: ["tranquilo", "moderado", "cheio"] },
    movimentoEm: { type: Date },
    urgencia: { type: String, enum: ["atendendo", "esgotada", "sem"] },
    atualizadoEm: { type: Date },
    atualizadoPor: { type: String },
  },
  faltas: { type: [FaltaSchema], default: [] },
  // "Atualizações de hoje" no painel do setor (só uso interno; o portal não mostra quem atualizou).
  registros: {
    type: [new mongoose.Schema({ em: { type: Date, default: Date.now }, por: String, texto: String }, { _id: false })],
    default: [],
  },
  faltasEm: { type: Date },
  faltasPor: { type: String },
  atualizadoEm: { type: Date, default: Date.now },
});

export default mongoose.models.Setor || mongoose.model('Setor', SetorSchema);
