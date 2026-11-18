import mongoose from 'mongoose';

// Pedido de cadastro feito pelo próprio paciente no portal público (sem senha).
// O CEP define a equipe, a microárea e o ACS que recebe o pedido.
// Fluxo: Aguardando → Confirmado (ACS marca a visita) → ACaminho (saiu para a visita)
// → Cadastrado (visita realizada: vira um Paciente na lista da equipe).
// Paciente ausente: Ausente → remarca (Confirmado), até 3 tentativas.
// Recusada (o paciente recusou a visita) e Cancelado encerram o pedido.
// Cada passo fica no histórico, que o paciente vê como um rastreio.
export const SITUACOES_AGENDAMENTO = ["Aguardando", "Confirmado", "ACaminho", "Ausente", "Cadastrado", "Recusada", "Cancelado"];
export const PERIODOS = ["Manhã", "Tarde"];
export const TIPOS_EVENTO = ["recebido", "agendado", "remarcado", "a_caminho", "ausente", "realizada", "recusada", "cancelado", "encerrado"];

const EventoSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: TIPOS_EVENTO, required: true },
    em: { type: Date, default: Date.now },
    por: { type: String }, // nome do agente, ou "paciente"
    nota: { type: String }, // recado que o paciente vê
    data: { type: Date }, // visita marcada/remarcada
    periodo: { type: String, enum: PERIODOS },
    tentativa: { type: Number }, // ausências: 1ª, 2ª…
  },
  { _id: false }
);

const AgendamentoSchema = new mongoose.Schema({
  protocolo: { type: String, required: true, unique: true },

  // Identificação
  nome: { type: String, required: true },
  cpf: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  cns: { type: String },
  telefone: { type: String, required: true }, // WhatsApp
  outroTelefone: { type: String },

  // Endereço
  cep: { type: String },
  endereco: { type: String, required: true },
  numero: { type: String, required: true },
  pontoReferencia: { type: String },

  // Pedidos antigos ainda podem ter trabalho e endereço de moradia; o portal não pergunta mais
  // (trabalhadores não são cadastrados pelo portal).
  trabalhador: { type: String, enum: ["Sim", "Não"] },
  enderecoMoradia: { type: String },
  melhorHorario: { type: String, required: true }, // horário fixo (07:00 a 18:00) escolhido pelo paciente

  // Moradores
  moradoresHomens: { type: Number, default: 0, min: 0, max: 99 },
  moradoresMulheres: { type: Number, default: 0, min: 0, max: 99 },
  moradoresCriancas: { type: Number, default: 0, min: 0, max: 99 },

  // Saúde
  gruposAtencao: [{ type: String, enum: ["Diabéticos", "Hipertensos", "Gestantes"] }],
  numeroSES: { type: String },
  observacao: { type: String }, // motivo da solicitação de cadastro

  // Preferência do paciente
  dataPreferida: { type: Date, required: true },
  periodoPreferido: { type: String, enum: PERIODOS, required: true },

  // Território (definido pelo CEP no momento do pedido)
  equipe: { type: String, required: true },
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
  tentativas: { type: Number, default: 0 }, // visitas sem encontrar ninguém
  historico: { type: [EventoSchema], default: [] },

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
