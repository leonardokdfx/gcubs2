import mongoose from 'mongoose';

// Território da Estratégia Saúde da Família: cada equipe é dividida em
// microáreas, e cada microárea tem um ACS responsável e a lista de CEPs
// (um por endereço, ex.: "SQN 404 Bloco A") que ela cobre.
const CepSchema = new mongoose.Schema(
  {
    cep: { type: String, required: true }, // só dígitos (8)
    endereco: { type: String, default: "" },
  },
  { _id: false }
);

const MicroareaSchema = new mongoose.Schema({
  equipe: { type: String, enum: ["Ar", "Fogo", "Terra", "Água", "Sol"], required: true },
  numero: { type: Number, required: true, min: 1, max: 99 },
  descricao: { type: String, default: "" }, // quadras/logradouros, ex.: "CLN 404, SGAN 604, SQN 404"
  agente: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ceps: { type: [CepSchema], default: [] },
  criadoEm: { type: Date, default: Date.now },
});

MicroareaSchema.index({ equipe: 1, numero: 1 }, { unique: true });
MicroareaSchema.index({ "ceps.cep": 1 });

export default mongoose.models.Microarea || mongoose.model('Microarea', MicroareaSchema);
