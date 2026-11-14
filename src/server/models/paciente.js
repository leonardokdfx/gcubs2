import mongoose from 'mongoose';

const PacienteSchema = new mongoose.Schema({
  // Dados da visita
  dataHoje: { type: Date, required: true },
  responsavel: { type: String, required: true },

  // Dados do paciente
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  telefone: { type: String, required: true },

  // Endereço
  cep: { type: String },
  endereco: { type: String, required: true },
  numero: { type: String, required: true },
  pontoReferencia: { type: String },

  // Situação de trabalho
  trabalhador: { type: String, enum: ["Sim", "Não"], required: true },
  enderecoMoradia: { type: String },

  // Visita
  melhorHorario: { type: String, required: true },

  // Moradores
  moradoresHomens: { type: Number, default: 0 },
  moradoresMulheres: { type: Number, default: 0 },
  moradoresCriancas: { type: Number, default: 0 },

  // Saúde
  gruposAtencao: [{ type: String, enum: ["Diabéticos", "Hipertensos", "Gestantes"] }],
  numeroSES: { type: String },
  observacao: { type: String },

  // Organização
  equipe: {
    type: String,
    enum: ["Ar", "Fogo", "Terra", "Água", "Sol"],
    required: true
  },
  status: {
    type: String,
    enum: ["", "Visita realizada", "Visita realizada - paciente ausente", "Não mora"],
    default: ""
  },

  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

PacienteSchema.pre('save', function (next) {
  this.atualizadoEm = new Date();
  next();
});

PacienteSchema.pre('findOneAndUpdate', function (next) {
  this.set({ atualizadoEm: new Date() });
  next();
});

export default mongoose.models.Paciente || mongoose.model('Paciente', PacienteSchema);
