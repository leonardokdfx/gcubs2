import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true },
  foto: { type: String, default: "" },

  role: {
    type: String,
    enum: ["agente", "supervisor", "setor"],
    default: "agente",
    required: true,
  },

  // Obrigatório apenas para agentes; supervisor enxerga todas as equipes
  equipe: {
    type: String,
    required: function () { return this.role === "agente"; },
  },

  // Conta de setor (farmácia, laboratório…): só atualiza o funcionamento desses setores.
  setores: {
    type: [{ type: String, enum: ["farmacia", "laboratorio", "odontologia", "vacinacao", "ipe"] }], // = CHAVES_SETORES (utils/setores)
    default: undefined,
    validate: {
      validator: function (v) { return this.role !== "setor" || (Array.isArray(v) && v.length > 0); },
      message: "Escolha pelo menos um setor",
    },
  },

  criadoEm: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
