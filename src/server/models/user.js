import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true },
  foto: { type: String, default: "" },

  role: {
    type: String,
    enum: ["agente", "supervisor"],
    default: "agente",
    required: true,
  },

  // Obrigatório apenas para agentes; supervisor enxerga todas as equipes
  equipe: {
    type: String,
    enum: ["Ar", "Fogo", "Terra", "Água", "Sol"],
    required: function () { return this.role === "agente"; },
  },

  criadoEm: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
