import mongoose from 'mongoose';
import { CHAVES_MOTIVOS_FALTA, CHAVES_PROFISSIONAIS_CONSULTA, CHAVES_RESPOSTAS, REPASSES } from '@/utils/avisosConsulta';

// O paciente avisa pelo portal se vai ou não a uma consulta já marcada na UBS.
// "Não vou" fica pendente para o ACS repassar à equipe, que libera a vaga.
// Um aviso por paciente + dia + profissional: se o paciente responder de novo, o aviso é atualizado.
const AvisoConsultaSchema = new mongoose.Schema({
  paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },

  // Cópia do cadastro no momento do aviso, para o ACS achar o paciente sem abrir a ficha.
  nome: { type: String, required: true },
  cpf: { type: String, required: true },
  telefone: { type: String },
  equipe: { type: String, required: true },
  microarea: { type: Number },
  acs: { type: String }, // ACS responsável pelo paciente

  // A consulta
  dataConsulta: { type: Date, required: true }, // meia-noite UTC, como as outras datas do sistema
  horario: { type: String }, // "HH:MM", opcional
  profissional: { type: String, enum: CHAVES_PROFISSIONAIS_CONSULTA, required: true },

  // A resposta do paciente
  resposta: { type: String, enum: CHAVES_RESPOSTAS, required: true },
  motivo: { type: String, enum: CHAVES_MOTIVOS_FALTA },
  observacao: { type: String, maxlength: 200 },
  mudouDeIdeia: { type: Boolean, default: false }, // trocou a resposta depois de já ter avisado

  // O que o ACS fez
  repasse: { type: String, enum: REPASSES, required: true },
  repassadoPor: { type: String },
  repassadoEm: { type: Date },

  origem: { type: String }, // hash do IP (LGPD), como nos pedidos do portal
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

AvisoConsultaSchema.index({ paciente: 1, dataConsulta: 1, profissional: 1 }, { unique: true });
AvisoConsultaSchema.index({ equipe: 1, dataConsulta: 1 });

export default mongoose.models.AvisoConsulta || mongoose.model('AvisoConsulta', AvisoConsultaSchema);
