import mongoose from 'mongoose';

// Equipes de Saúde da Família da unidade. O supervisor cria, renomeia e exclui (src/server/equipes.js).
// Os outros cadastros (pacientes, ACS, microáreas, pedidos…) guardam o NOME da equipe;
// ao renomear ou excluir com transferência, eles são atualizados juntos.
const EquipeSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
  icone: { type: String, default: "vento" }, // chave de ICONES_EQUIPE (src/utils/equipes.js)
  ordem: { type: Number, default: 0 },
  criadoEm: { type: Date, default: Date.now },
});

export default mongoose.models.Equipe || mongoose.model('Equipe', EquipeSchema);
