"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  Clock,
  DoorClosed,
  Footprints,
  HeartPulse,
  Inbox,
  MapPin,
  MapPinned,
  MessageCircle,
  MessageSquare,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { useSearchParams } from "../lib/router";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import AgendamentoTag from "../components/AgendamentoTag";
import { HistoricoRastreio } from "../components/RastreioPedido";
import { Alert, Button, ButtonLink, EmptyState, Field, PageHeader, Skeleton } from "../components/ui";
import { FormDialog, useToast } from "../components/feedback";
import { NOMES_EQUIPES } from "../constants/dominio";
import { enderecoCompleto, exibirCPF, exibirTelefone, hrefTelefone, linkWhatsApp, plural, primeiroNome, rotuloMicroarea } from "../utils/formatos";
import { EM_ANDAMENTO, HORARIOS, MAX_TENTATIVAS, PERIODOS, exibirData, hojeNoFuso, ordinal, paraISO } from "../utils/agendamento";

/** A visita marcada é para hoje (ou já passou e ninguém registrou o resultado). */
const visitaDeHoje = (p, hoje) => p.situacao === "ACaminho" || (p.situacao === "Confirmado" && paraISO(p.dataAgendada) <= hoje);

/** Abas da tela, na ordem do trabalho do ACS. */
const FILTROS = [
  { chave: "Aguardando", rotulo: "Novos", incluir: (p) => p.situacao === "Aguardando" },
  { chave: "hoje", rotulo: "Visitas de hoje", incluir: visitaDeHoje },
  { chave: "Confirmado", rotulo: "Marcados", incluir: (p, hoje) => p.situacao === "Confirmado" && !visitaDeHoje(p, hoje) },
  { chave: "Ausente", rotulo: "Remarcar", incluir: (p) => p.situacao === "Ausente" },
  { chave: "Cadastrado", rotulo: "Realizadas", incluir: (p) => p.situacao === "Cadastrado" },
  { chave: "encerrados", rotulo: "Encerrados", incluir: (p) => p.situacao === "Recusada" || p.situacao === "Cancelado" },
];
const CHAVES_FILTRO = FILTROS.map((f) => f.chave);

function Linha({ icone: Icone, children }) {
  return (
    <span className="list-item__meta-row">
      <Icone aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** Mensagem pronta para o ACS mandar pelo WhatsApp, conforme a situação do pedido. */
function mensagemWhatsApp(pedido, nomeAgente) {
  const ola = `Olá, ${primeiroNome(pedido.nome)}! Aqui é ${nomeAgente || "o agente comunitário de saúde"}, da equipe ${pedido.equipe} da UBS.`;
  if (pedido.situacao === "ACaminho") {
    return `${ola} Estou a caminho da sua casa para a visita de cadastro (protocolo ${pedido.protocolo}). Alguém pode me receber?`;
  }
  if (pedido.situacao === "Ausente") {
    return `${ola} Passei na sua casa para a visita de cadastro e não encontrei ninguém. Qual dia e período ficam bons para eu voltar? Protocolo ${pedido.protocolo}.`;
  }
  if (pedido.situacao === "Confirmado") {
    return `${ola} Sua visita para o cadastro está marcada para ${exibirData(pedido.dataAgendada)}, no período da ${pedido.periodoAgendado?.toLowerCase()}. Protocolo ${pedido.protocolo}. Se não puder receber, me avise por aqui.`;
  }
  return `${ola} Recebemos seu pedido de cadastro (protocolo ${pedido.protocolo}) para ${exibirData(pedido.dataPreferida)}, ${pedido.periodoPreferido?.toLowerCase()}${HORARIOS.includes(pedido.melhorHorario) ? `, por volta das ${pedido.melhorHorario}` : ""}. Esse dia fica bom para você?`;
}

function Pedido({ pedido, nomeAgente, selecionavel, selecionado, onSelecionar, onConfirmar, onSair, onResultado, onCancelar }) {
  const tel = hrefTelefone(pedido.telefone);
  const whatsapp = linkWhatsApp(pedido.telefone, mensagemWhatsApp(pedido, nomeAgente));
  const moradores = (pedido.moradoresHomens || 0) + (pedido.moradoresMulheres || 0) + (pedido.moradoresCriancas || 0);
  const andamento = EM_ANDAMENTO.includes(pedido.situacao);
  const marcada = pedido.situacao === "Confirmado" || pedido.situacao === "ACaminho";
  const idTitulo = `pedido-${pedido._id}`;

  return (
    <li className="list-item" data-selected={selecionado ? "true" : undefined}>
      {selecionavel && (
        <div className="list-item__selecao">
          <label className="checkbox-hit">
            <input type="checkbox" className="checkbox" checked={selecionado} onChange={() => onSelecionar(pedido._id)} aria-labelledby={idTitulo} />
          </label>
        </div>
      )}
      <div className="list-item__main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="list-item__title" id={idTitulo}>
            {pedido.nome}
          </span>
          <AgendamentoTag situacao={pedido.situacao} />
          {pedido.equipe && (
            <span className="tag">
              Equipe {pedido.equipe}
              {pedido.microarea ? ` · ${rotuloMicroarea(pedido.microarea)}` : ""}
            </span>
          )}
        </div>

        <div className="list-item__meta">
          {marcada ? (
            <Linha icone={CalendarCheck}>
              <strong>
                Visita: {exibirData(pedido.dataAgendada)}, {pedido.periodoAgendado?.toLowerCase()} · {pedido.responsavel}
              </strong>
            </Linha>
          ) : (
            <Linha icone={CalendarDays}>
              Prefere {exibirData(pedido.dataPreferida)}, {pedido.periodoPreferido?.toLowerCase()}
            </Linha>
          )}
          <Linha icone={MapPin}>
            {enderecoCompleto(pedido)}
            {pedido.pontoReferencia && ` · ${pedido.pontoReferencia}`}
            {pedido.cep && ` · CEP ${pedido.cep}`}
          </Linha>
          <span className="list-item__meta-row">
            <Phone aria-hidden="true" />
            {tel ? <a href={tel}>{exibirTelefone(pedido.telefone)}</a> : <span>{exibirTelefone(pedido.telefone)}</span>}
            {pedido.outroTelefone && (
              <>
                <span aria-hidden="true">·</span>
                {hrefTelefone(pedido.outroTelefone) ? (
                  <a href={hrefTelefone(pedido.outroTelefone)}>Outro: {exibirTelefone(pedido.outroTelefone)}</a>
                ) : (
                  <span>Outro: {exibirTelefone(pedido.outroTelefone)}</span>
                )}
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="num">CPF {exibirCPF(pedido.cpf)}</span>
            {pedido.dataNascimento && (
              <>
                <span aria-hidden="true">·</span>
                <span>Nasc. {exibirData(pedido.dataNascimento, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
              </>
            )}
            {pedido.cns && (
              <>
                <span aria-hidden="true">·</span>
                <span className="num">CNS {pedido.cns}</span>
              </>
            )}
          </span>
          {pedido.situacao === "Aguardando" && (
            <Linha icone={MapPinned}>{pedido.responsavel ? `ACS da microárea: ${pedido.responsavel}` : "Microárea sem ACS definido"}</Linha>
          )}
          <Linha icone={Clock}>Melhor horário: {pedido.melhorHorario}</Linha>
          {pedido.tentativas > 0 && (
            <Linha icone={DoorClosed}>
              <strong>
                {pedido.tentativas} de {MAX_TENTATIVAS} tentativas sem encontrar ninguém
              </strong>
            </Linha>
          )}
          <Linha icone={Users}>
            {plural(moradores, "morador", "moradores")}
            {moradores > 0 &&
              ` (${pedido.moradoresHomens || 0} H, ${pedido.moradoresMulheres || 0} M, ${pedido.moradoresCriancas || 0} crianças)`}
            {pedido.trabalhador === "Sim" && " · trabalha fora"}
          </Linha>
          {pedido.gruposAtencao?.length > 0 && <Linha icone={HeartPulse}>{pedido.gruposAtencao.join(", ")}</Linha>}
          {pedido.observacao && <Linha icone={MessageSquare}>Motivo do pedido: “{pedido.observacao}”</Linha>}
          {pedido.situacao === "Cancelado" && (
            <Linha icone={MessageSquare}>
              {pedido.canceladoPor === "paciente" ? "Cancelado pelo paciente" : `Encerrado pela equipe: ${pedido.motivoCancelamento}`}
            </Linha>
          )}
          <span className="list-item__meta-row" style={{ fontSize: "var(--text-sm)" }}>
            {pedido.protocolo && <>Protocolo <span className="num">{pedido.protocolo}</span> · </>}
            Pedido feito em {exibirData(pedido.criadoEm, { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        </div>

        <details className="rastreio-detalhes">
          <summary>Ver histórico (o que o paciente vê)</summary>
          <HistoricoRastreio pedido={pedido} rotulo={`Histórico do pedido de ${pedido.nome}`} />
        </details>

        {(andamento || (pedido.situacao === "Cadastrado" && pedido.paciente)) && (
          <div className="list-item__actions" style={{ flexWrap: "wrap" }}>
            {pedido.situacao === "Aguardando" && (
              <Button size="sm" variant="primary" icon={CalendarCheck} onClick={() => onConfirmar(pedido)}>
                Marcar visita
              </Button>
            )}
            {pedido.situacao === "Ausente" && (
              <Button size="sm" variant="primary" icon={CalendarClock} onClick={() => onConfirmar(pedido)}>
                Remarcar visita
              </Button>
            )}
            {pedido.situacao === "Confirmado" && !selecionavel && (
              <Button size="sm" icon={Footprints} onClick={() => onSair([pedido])}>
                Sair para visita
              </Button>
            )}
            {marcada && (
              <Button size="sm" variant={pedido.situacao === "ACaminho" ? "primary" : undefined} icon={ClipboardCheck} onClick={() => onResultado(pedido)}>
                Registrar resultado
              </Button>
            )}
            {marcada && (
              <Button size="sm" variant="ghost" icon={CalendarClock} onClick={() => onConfirmar(pedido)}>
                Remarcar
              </Button>
            )}
            {andamento && whatsapp && (
              <a className="btn btn--sm" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                WhatsApp
              </a>
            )}
            {andamento && (
              <Button size="sm" variant="ghost" className="btn--danger-text" onClick={() => onCancelar(pedido)}>
                {pedido.situacao === "Aguardando" ? "Recusar pedido" : "Cancelar"}
              </Button>
            )}
            {pedido.situacao === "Cadastrado" && pedido.paciente && (
              <ButtonLink
                to={`/equipe/${encodeURIComponent(pedido.equipe)}/editar/${pedido.paciente}`}
                size="sm"
                variant="ghost"
                className="btn--primary-text"
                icon={UserRound}
              >
                Ver cadastro do paciente
              </ButtonLink>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Formulário de confirmação/remarcação da visita. */
function ConfirmarVisita({ pedido, supervisor, equipeUsuario, nomeUsuario, onFechar, onSalvo }) {
  const toast = useToast();
  // A equipe vem do CEP do paciente; só pedidos antigos, sem equipe, deixam escolher.
  const equipeFixa = !!pedido.equipe;
  const [equipe, setEquipe] = useState(pedido.equipe || (supervisor ? "" : equipeUsuario));
  const [responsavel, setResponsavel] = useState(pedido.responsavel || "");
  const [data, setData] = useState(paraISO(pedido.dataAgendada || pedido.dataPreferida));
  const [periodo, setPeriodo] = useState(pedido.periodoAgendado || pedido.periodoPreferido || "");
  const [agentes, setAgentes] = useState([]);
  const [carregandoAgentes, setCarregandoAgentes] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!equipe) {
      setAgentes([]);
      return;
    }
    setCarregandoAgentes(true);
    api
      .get(`/auth/responsaveis/${encodeURIComponent(equipe)}`)
      .then((lista) => {
        setAgentes(lista);
        setResponsavel((atual) => {
          if (atual && lista.some((a) => a.nome === atual)) return atual;
          return lista.some((a) => a.nome === nomeUsuario) ? nomeUsuario : "";
        });
      })
      .catch((err) => setErro(err.message))
      .finally(() => setCarregandoAgentes(false));
  }, [equipe, nomeUsuario]);

  const salvar = async () => {
    setErro("");
    if (!equipe) return setErro("Selecione a equipe.");
    if (!responsavel) return setErro("Selecione o agente que fará a visita.");
    if (!data) return setErro("Informe a data da visita.");
    if (data < hojeNoFuso()) return setErro("A data da visita não pode estar no passado.");
    if (!periodo) return setErro("Escolha manhã ou tarde.");

    setSalvando(true);
    try {
      await api.put(`/agendamentos/${pedido._id}`, { acao: "confirmar", equipe, responsavel, dataAgendada: data, periodoAgendado: periodo });
      toast.sucesso(`Visita de ${pedido.nome} marcada para ${exibirData(`${data}T00:00:00Z`)}.`);
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <FormDialog
      open
      title={pedido.situacao === "Aguardando" ? "Marcar visita" : "Remarcar visita"}
      description={
        <>
          {pedido.situacao === "Ausente" && <>Ninguém foi encontrado na última visita ({ordinal(pedido.tentativas)} tentativa de {MAX_TENTATIVAS}). </>}
          <strong>{pedido.nome}</strong> pediu {exibirData(pedido.dataPreferida)}, {pedido.periodoPreferido?.toLowerCase()}
          {HORARIOS.includes(pedido.melhorHorario) && `, por volta das ${pedido.melhorHorario}`}. Combine com o paciente pelo telefone{" "}
          {exibirTelefone(pedido.telefone)} se precisar mudar. O paciente vê a data no rastreio do pedido.
        </>
      }
      submitLabel={pedido.situacao === "Aguardando" ? "Marcar visita" : "Salvar nova data"}
      loading={salvando}
      onSubmit={salvar}
      onCancel={onFechar}
    >
      {erro && <Alert type="danger">{erro}</Alert>}
      {equipeFixa ? (
        <p className="field__hint" style={{ margin: 0 }}>
          Equipe {pedido.equipe}
          {pedido.microarea ? `, ${rotuloMicroarea(pedido.microarea).toLowerCase()}` : ""} (definida pelo CEP do paciente).
        </p>
      ) : supervisor && (
        <Field label="Equipe" required htmlFor="conf-equipe">
          {(props) => (
            <select {...props} className="select" value={equipe} onChange={(e) => setEquipe(e.target.value)}>
              <option value="">Selecione a equipe</option>
              {NOMES_EQUIPES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field
        label="Agente que fará a visita"
        required
        htmlFor="conf-responsavel"
        hint={equipe && !carregandoAgentes && agentes.length === 0 ? "Nenhum agente cadastrado nesta equipe." : undefined}
      >
        {(props) => (
          <select
            {...props}
            className="select"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            disabled={!equipe || carregandoAgentes}
          >
            <option value="">{carregandoAgentes ? "Carregando agentes…" : equipe ? "Selecione o agente" : "Escolha a equipe primeiro"}</option>
            {agentes.map((a) => (
              <option key={a._id} value={a.nome}>
                {a.nome}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Data da visita" required htmlFor="conf-data">
        {(props) => <input {...props} type="date" className="input" min={hojeNoFuso()} value={data} onChange={(e) => setData(e.target.value)} />}
      </Field>
      <fieldset className="fieldset field">
        <legend className="field__label">
          Período
          <span className="field__required" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="choices">
          {PERIODOS.map((p) => (
            <label key={p} className="choice choice--radio">
              <input type="radio" name="conf-periodo" value={p} checked={periodo === p} onChange={() => setPeriodo(p)} />
              <span className="choice__check" aria-hidden="true" />
              {p}
            </label>
          ))}
        </div>
      </fieldset>
    </FormDialog>
  );
}

function CancelarPedido({ pedido, onFechar, onSalvo }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const recusa = pedido.situacao === "Aguardando";

  const salvar = async () => {
    if (!motivo.trim()) return setErro("Informe o motivo. O paciente verá essa mensagem.");
    setSalvando(true);
    try {
      await api.put(`/agendamentos/${pedido._id}`, { acao: "cancelar", motivo: motivo.trim() });
      toast.sucesso(recusa ? "Pedido recusado." : "Pedido cancelado.");
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <FormDialog
      open
      danger
      title={recusa ? "Recusar pedido?" : "Cancelar pedido?"}
      description={<>O pedido de <strong>{pedido.nome}</strong> será encerrado. O paciente verá o motivo na área do paciente.</>}
      submitLabel={recusa ? "Recusar pedido" : "Cancelar pedido"}
      loading={salvando}
      onSubmit={salvar}
      onCancel={onFechar}
    >
      <Field label="Motivo" required htmlFor="cancelar-motivo" error={erro}>
        {(props) => (
          <textarea
            {...props}
            className="textarea"
            rows={3}
            maxLength={300}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro("");
            }}
            placeholder="Ex.: endereço fora da área da unidade"
          />
        )}
      </Field>
    </FormDialog>
  );
}

const OPCOES_RESULTADO = [
  { valor: "realizada", rotulo: "Visita realizada", detalhe: "O paciente entra na lista da equipe e é avisado de que já pode procurar a UBS para marcar consulta." },
  { valor: "ausente", rotulo: "Paciente ausente", detalhe: "Ninguém atendeu. O pedido volta para você remarcar." },
  { valor: "recusada", rotulo: "Visita recusada", detalhe: "O paciente ou a família não quis receber a visita. O pedido é encerrado." },
];

/** O ACS registra como foi a visita: realizada, ausente ou recusada. */
function ResultadoVisita({ pedido, onFechar, onSalvo }) {
  const toast = useToast();
  const [resultado, setResultado] = useState("");
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const tentativa = (pedido.tentativas || 0) + 1;
  const ultima = tentativa >= MAX_TENTATIVAS;

  const salvar = async () => {
    if (!resultado) return setErro("Escolha o resultado da visita.");
    setSalvando(true);
    try {
      const r = await api.put(`/agendamentos/${pedido._id}`, { acao: "resultado", resultado, nota: nota.trim() });
      toast.sucesso(r.message);
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <FormDialog
      open
      title="Resultado da visita"
      description={
        <>
          Visita de cadastro de <strong>{pedido.nome}</strong>, {enderecoCompleto(pedido)}. O paciente vê o resultado em "Acompanhar meu pedido".
        </>
      }
      submitLabel="Registrar resultado"
      loading={salvando}
      onSubmit={salvar}
      onCancel={onFechar}
    >
      {erro && <Alert type="danger">{erro}</Alert>}
      <fieldset className="fieldset field">
        <legend className="field__label">
          Como foi a visita?
          <span className="field__required" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="choices" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {OPCOES_RESULTADO.map((o) => (
            <label key={o.valor} className="choice choice--radio" style={{ alignItems: "flex-start" }}>
              <input
                type="radio"
                name="resultado-visita"
                value={o.valor}
                checked={resultado === o.valor}
                onChange={() => {
                  setResultado(o.valor);
                  setErro("");
                }}
              />
              <span className="choice__check" aria-hidden="true" />
              <span>
                <strong>
                  {o.rotulo}
                  {o.valor === "ausente" && ` (${ordinal(tentativa)} tentativa de ${MAX_TENTATIVAS})`}
                </strong>
                <br />
                <span className="field__hint">{o.detalhe}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {resultado === "ausente" && ultima && (
        <Alert type="warning">
          Esta é a {ordinal(MAX_TENTATIVAS)} tentativa. O pedido será encerrado e o paciente será orientado a procurar a UBS ou fazer um novo pedido.
        </Alert>
      )}
      <Field label="Recado para o paciente" optional htmlFor="resultado-nota" hint="Aparece no rastreio do pedido. Ex.: deixei um aviso com o porteiro.">
        {(props) => <textarea {...props} className="textarea" rows={2} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />}
      </Field>
    </FormDialog>
  );
}

const ORDEM_PERIODO = { Manhã: 0, Tarde: 1 };

function Agendamentos() {
  const { user } = useAuth();
  const toast = useToast();
  const supervisor = user?.role === "supervisor";
  const [params, setParams] = useSearchParams();
  const hoje = hojeNoFuso();

  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState(null);
  const [cancelando, setCancelando] = useState(null);
  const [registrando, setRegistrando] = useState(null);
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [saindo, setSaindo] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .get("/agendamentos")
      .then((data) => {
        setPedidos(data);
        setErro("");
      })
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(carregar, [carregar]);

  const contagem = useMemo(() => Object.fromEntries(FILTROS.map((f) => [f.chave, pedidos.filter((p) => f.incluir(p, hoje)).length])), [pedidos, hoje]);

  // Sem filtro na URL: abre nas visitas de hoje, se houver; senão, nos pedidos novos.
  const pedidoFiltro = params.get("situacao");
  const filtro = CHAVES_FILTRO.includes(pedidoFiltro) ? pedidoFiltro : contagem.hoje > 0 ? "hoje" : "Aguardando";
  const aba = FILTROS.find((f) => f.chave === filtro);

  const visiveis = useMemo(() => {
    const lista = pedidos.filter((p) => aba.incluir(p, hoje));
    const quando = (p) => new Date(p.atualizadoEm || p.criadoEm);
    switch (filtro) {
      case "Aguardando":
        return lista.sort((a, b) => new Date(a.dataPreferida) - new Date(b.dataPreferida));
      case "hoje":
        // Quem já está a caminho primeiro; depois manhã antes da tarde e o horário que o paciente prefere.
        return lista.sort(
          (a, b) =>
            (a.situacao === "ACaminho" ? 0 : 1) - (b.situacao === "ACaminho" ? 0 : 1) ||
            (ORDEM_PERIODO[a.periodoAgendado] ?? 2) - (ORDEM_PERIODO[b.periodoAgendado] ?? 2) ||
            String(a.melhorHorario).localeCompare(String(b.melhorHorario))
        );
      case "Confirmado":
        return lista.sort((a, b) => new Date(a.dataAgendada) - new Date(b.dataAgendada));
      case "Ausente":
        return lista.sort((a, b) => quando(a) - quando(b));
      default:
        return lista.sort((a, b) => quando(b) - quando(a));
    }
  }, [pedidos, aba, filtro, hoje]);

  // Só dá para sair para casas com visita marcada que ainda não estão "a caminho".
  const prontosParaSair = filtro === "hoje" ? visiveis.filter((p) => p.situacao === "Confirmado") : [];
  const marcados = prontosParaSair.filter((p) => selecionados.has(p._id));

  const alternar = (id) =>
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const alternarTodos = () =>
    setSelecionados(marcados.length === prontosParaSair.length ? new Set() : new Set(prontosParaSair.map((p) => p._id)));

  const trocarFiltro = (chave) => {
    setSelecionados(new Set());
    setParams({ situacao: chave }, { replace: true });
  };

  const sair = async (lista) => {
    if (lista.length === 0) return;
    setSaindo(true);
    const resultados = await Promise.allSettled(lista.map((p) => api.put(`/agendamentos/${p._id}`, { acao: "sair" })));
    const falhas = resultados.filter((r) => r.status === "rejected");
    const ok = lista.length - falhas.length;
    if (ok > 0) {
      toast.sucesso(
        ok === 1 ? `Saída registrada. ${primeiroNome(lista.find((_, i) => resultados[i].status === "fulfilled").nome)} vê "agente a caminho".` : `Saída registrada para ${ok} casas. Os pacientes veem "agente a caminho".`
      );
    }
    if (falhas.length > 0) toast.erro(falhas[0].reason?.message || "Não foi possível registrar a saída de alguns pedidos.");
    setSelecionados(new Set());
    setSaindo(false);
    carregar();
  };

  const fecharEAtualizar = () => {
    setConfirmando(null);
    setCancelando(null);
    setRegistrando(null);
    carregar();
  };

  const vazio = {
    Aguardando: ["Nenhum pedido novo", "Quando um paciente pedir cadastro pela área do paciente, o pedido aparece aqui."],
    hoje: ["Nenhuma visita para hoje", "As visitas marcadas para hoje aparecem aqui para você montar o roteiro e sair."],
    Confirmado: ["Nenhuma visita marcada", supervisor ? "Nenhuma equipe tem visitas de cadastro marcadas para os próximos dias." : "Você não tem visitas de cadastro marcadas para os próximos dias."],
    Ausente: ["Nada para remarcar", "Quando você registrar que o paciente estava ausente, o pedido volta aqui para marcar outro dia."],
    Cadastrado: ["Nenhuma visita realizada", "Quando você registrar a visita como realizada, o paciente entra na lista da equipe e aparece aqui."],
    encerrados: ["Nenhum pedido encerrado", "Pedidos recusados, cancelados ou encerrados por ausência aparecem aqui."],
  }[filtro];

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/dashboard" }, { label: "Pedidos de cadastro" }]}
        title="Pedidos de cadastro"
        description={
          supervisor
            ? "Pacientes que pediram cadastro pela área do paciente. Cada passo registrado pelo ACS aparece para o paciente como um rastreio."
            : "Pedidos da sua microárea. Marque a visita, registre a saída e o resultado: o paciente acompanha cada passo em \"Acompanhar meu pedido\"."
        }
      />

      <div className="stack">
        <div className="chips" role="group" aria-label="Filtrar pedidos">
          {FILTROS.map((f) => (
            <button key={f.chave} type="button" className="chip" aria-pressed={filtro === f.chave} onClick={() => trocarFiltro(f.chave)}>
              {f.rotulo}
              <span className="chip__count">{(contagem[f.chave] || 0).toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>

        {filtro === "Aguardando" && !supervisor && contagem.Aguardando > 0 && (
          <Alert type="info">
            Aqui aparecem os pedidos da sua microárea, definida pelo CEP do paciente, e os de microáreas da equipe {user?.equipe} que ainda não têm ACS
            definido. Quem marcar a visita fica responsável pelo pedido.
          </Alert>
        )}

        {erro && (
          <Alert type="danger" action={<Button size="sm" onClick={carregar}>Tentar de novo</Button>}>
            {erro}
          </Alert>
        )}

        {filtro === "hoje" && !carregando && prontosParaSair.length > 0 && (
          <div className="paper" style={{ padding: "var(--space-4)" }}>
            <div className="roteiro-barra">
              <div>
                <strong>Roteiro de hoje</strong>
                <p className="field__hint" style={{ margin: 0 }}>
                  Marque as casas que vai visitar agora e toque em "Sair para visita". Os pacientes passam a ver "agente a caminho".
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button size="sm" variant="ghost" onClick={alternarTodos}>
                  {marcados.length === prontosParaSair.length ? "Desmarcar todas" : "Marcar todas"}
                </Button>
                <Button size="sm" variant="primary" icon={Footprints} disabled={marcados.length === 0} loading={saindo} loadingText="Registrando…" onClick={() => sair(marcados)}>
                  Sair para visita{marcados.length > 0 ? ` (${marcados.length})` : ""}
                </Button>
              </div>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="paper list-paper" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ padding: 16, borderTop: i ? "1px solid var(--gray-90)" : 0, display: "grid", gap: 8 }}>
                <Skeleton width="45%" height={16} />
                <Skeleton width="75%" height={12} />
                <Skeleton width="60%" height={12} />
              </div>
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          !erro && (
            <div className="paper">
              <EmptyState icon={Inbox} title={vazio[0]}>
                {vazio[1]}
              </EmptyState>
            </div>
          )
        ) : (
          <div className="paper list-paper">
            <div className="list-paper__head">
              <span>{plural(visiveis.length, "pedido", "pedidos")}</span>
            </div>
            <ul className="list" aria-label={`Pedidos: ${aba.rotulo}`}>
              {visiveis.map((p) => (
                <Pedido
                  key={p._id}
                  pedido={p}
                  nomeAgente={user?.nome}
                  selecionavel={filtro === "hoje" && p.situacao === "Confirmado"}
                  selecionado={selecionados.has(p._id)}
                  onSelecionar={alternar}
                  onConfirmar={setConfirmando}
                  onSair={sair}
                  onResultado={setRegistrando}
                  onCancelar={setCancelando}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {confirmando && (
        <ConfirmarVisita
          pedido={confirmando}
          supervisor={supervisor}
          equipeUsuario={user?.equipe}
          nomeUsuario={user?.nome}
          onFechar={() => setConfirmando(null)}
          onSalvo={fecharEAtualizar}
        />
      )}
      {cancelando && <CancelarPedido pedido={cancelando} onFechar={() => setCancelando(null)} onSalvo={fecharEAtualizar} />}
      {registrando && <ResultadoVisita pedido={registrando} onFechar={() => setRegistrando(null)} onSalvo={fecharEAtualizar} />}
    </AppLayout>
  );
}

export default Agendamentos;
