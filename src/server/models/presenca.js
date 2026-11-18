import mongoose from 'mongoose';
import { CHAVES_MOTIVOS, CHAVES_PROFISSIONAIS, SITUACOES_PRESENCA, TURNOS } from '@/utils/presenca';

// Presença do médico e do enfermeiro de cada equipe, dia a dia.
// O supervisor marca "presente" ou "ausente" (com motivo). Sem registro = ainda não informado.
// Quando está ausente, o portal avisa o paciente para procurar a unidade ou o ACS e remarcar a consulta.
const PresencaSchema = new mongoose.Schema({
  equipe: { type: String, required: true },
  profissional: { type: String, enum: CHAVES_PROFISSIONAIS, required: true },
  data: { type: Date, required: true }, // meia-noite UTC, como as outras datas do sistema
  situacao: { type: String, enum: SITUACOES_PRESENCA, required: true },
  motivo: { type: String, enum: CHAVES_MOTIVOS },
  turno: { type: String, enum: TURNOS, default: "Dia todo" },
  recado: { type: String, maxlength: 200 }, // texto que o paciente vê (ex.: "Volta dia 25")
  registradoPor: { type: String },
  atualizadoEm: { type: Date, default: Date.now },
});

PresencaSchema.index({ equipe: 1, profissional: 1, data: 1 }, { unique: true });
PresencaSchema.index({ data: 1, situacao: 1 });

export default mongoose.models.Presenca || mongoose.model('Presenca', PresencaSchema);
