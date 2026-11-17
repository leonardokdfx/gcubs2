import mongoose from 'mongoose';

// Pedido de cadastro feito pelo próprio paciente no portal público (sem senha).
// O CEP define a equipe, a microárea e o ACS que recebe o pedido.
// Fluxo: Aguardando → Confirmado (ACS assume e marca a visita) → Cadastrado
// (vira um Paciente na lista da equipe). Pode ser Cancelado pelo paciente
// ou pela equipe enquanto não estiver Cadastrado.
export const SITUACOES_AGENDAMENTO = ["Aguardando", "Confirmado", "Cadastrado", "Cancelado"];
export const PERIODOS = ["Manhã", "Tarde"];

const AgendamentoSchema = new mongoose.Schema({
  protocolo: { type: String, required: true, unique: true },

  // Identificação
  nome: { type: String, required: true },
  cpf: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  cns: { type: String },
  telefone: { type: String, required: true },

  // Endereço
  cep: { type: String },
  endereco: { type: String, required: true },
  numero: { type: String, required: true },
  pontoReferencia: { type: String },

  // Situação de trabalho
  trabalhador: { type: String, enum: ["Sim", "Não"], required: true },
  enderecoMoradia: { type: String },
  melhorHorario: { type: String, required: true },

  // Moradores
  moradoresHomens: { type: Number, default: 0, min: 0, max: 99 },
  moradoresMulheres: { type: Number, default: 0, min: 0, max: 99 },
  moradoresCriancas: { type: Number, default: 0, min: 0, max: 99 },

  // Saúde
  gruposAtencao: [{ type: String, enum: ["Diabéticos", "Hipertensos", "Gestantes"] }],
  numeroSES: { type: String },
  observacao: { type: String },

  // Preferência do paciente
  dataPreferida: { type: Date, required: true },
  periodoPreferido: { type: String, enum: PERIODOS, required: true },

  // Território (definido pelo CEP no momento do pedido)
  equipe: { type: String, enum: ["Ar", "Fogo", "Terra", "Água", "Sol"], required: true },
  microarea: { type: Number },
  agente: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ACS da microárea

  // Tratamento pela equipe
  situacao: { type: String, enum: SITUACOES_AGENDAMENTO, default: "Aguardando" },
  responsavel: { type: String },
  dataAgendada: { type: Date },
  periodoAgendado: { type: String, enum: PERIODOS },
  motivoCancelamento: { type: String },
  canceladoPor: { type: String, enum: ["paciente", "equipe"] },
  paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente' },

  // LGPD e controle de abuso
  consentimentoEm: { type: Date, required: true },
  origem: { type: String }, // hash do IP, nunca o IP em texto

  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

AgendamentoSchema.index({ situacao: 1, dataPreferida: 1 });
AgendamentoSchema.index({ cpf: 1, criadoEm: -1 });
AgendamentoSchema.index({ origem: 1, criadoEm: -1 });
AgendamentoSchema.index({ equipe: 1, agente: 1, situacao: 1 });

AgendamentoSchema.pre('save', function (next) {
  this.atualizadoEm = new Date();
  next();
});

export default mongoose.models.Agendamento || mongoose.model('Agendamento', AgendamentoSchema);
