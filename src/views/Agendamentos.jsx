"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  Clock,
  HeartPulse,
  Inbox,
  MapPin,
  MapPinned,
  MessageCircle,
  MessageSquare,
  Phone,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useSearchParams } from "../lib/router";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import AgendamentoTag from "../components/AgendamentoTag";
import { Alert, Button, ButtonLink, EmptyState, Field, PageHeader, Skeleton } from "../components/ui";
import { ConfirmDialog, FormDialog, useToast } from "../components/feedback";
import { NOMES_EQUIPES } from "../constants/dominio";
import { enderecoCompleto, exibirCPF, exibirTelefone, hrefTelefone, linkWhatsApp, plural, primeiroNome, rotuloMicroarea } from "../utils/formatos";
import { PERIODOS, SITUACOES_AGENDAMENTO, exibirData, hojeNoFuso, paraISO } from "../utils/agendamento";

const FILTROS = ["Aguardando", "Confirmado", "Cadastrado", "Cancelado"];

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
  if (pedido.situacao === "Confirmado") {
    return `${ola} Sua visita para o cadastro está marcada para ${exibirData(pedido.dataAgendada)}, no período da ${pedido.periodoAgendado?.toLowerCase()}. Protocolo ${pedido.protocolo}. Se não puder receber, me avise por aqui.`;
  }
  return `${ola} Recebemos seu pedido de cadastro (protocolo ${pedido.protocolo}) para ${exibirData(pedido.dataPreferida)}, ${pedido.periodoPreferido?.toLowerCase()}. Esse dia fica bom para você?`;
}

function Pedido({ pedido, nomeAgente, onConfirmar, onIncluir, onCancelar }) {
  const tel = hrefTelefone(pedido.telefone);
  const whatsapp = linkWhatsApp(pedido.telefone, mensagemWhatsApp(pedido, nomeAgente));
  const moradores = (pedido.moradoresHomens || 0) + (pedido.moradoresMulheres || 0) + (pedido.moradoresCriancas || 0);
  const andamento = pedido.situacao === "Aguardando" || pedido.situacao === "Confirmado";

  return (
    <li className="list-item">
      <div className="list-item__main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="list-item__title">{pedido.nome}</span>
          <AgendamentoTag situacao={pedido.situacao} />
          {pedido.equipe && (
            <span className="tag">
              Equipe {pedido.equipe}
              {pedido.microarea ? ` · ${rotuloMicroarea(pedido.microarea)}` : ""}
            </span>
          )}
        </div>

        <div className="list-item__meta">
          {pedido.situacao === "Confirmado" ? (
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
          <Linha icone={Users}>
            {plural(moradores, "morador", "moradores")}
            {moradores > 0 &&
              ` (${pedido.moradoresHomens || 0} H, ${pedido.moradoresMulheres || 0} M, ${pedido.moradoresCriancas || 0} crianças)`}
            {pedido.trabalhador === "Sim" && " · trabalha fora"}
          </Linha>
          {pedido.gruposAtencao?.length > 0 && <Linha icone={HeartPulse}>{pedido.gruposAtencao.join(", ")}</Linha>}
          {pedido.observacao && <Linha icone={MessageSquare}>“{pedido.observacao}”</Linha>}
          {pedido.situacao === "Cancelado" && (
            <Linha icone={MessageSquare}>
              {pedido.canceladoPor === "paciente" ? "Cancelado pelo paciente" : `Cancelado pela equipe: ${pedido.motivoCancelamento}`}
            </Linha>
          )}
          <span className="list-item__meta-row" style={{ fontSize: "var(--text-sm)" }}>
            {pedido.protocolo && <>Protocolo <span className="num">{pedido.protocolo}</span> · </>}
            Pedido feito em {exibirData(pedido.criadoEm, { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        </div>

        {(andamento || (pedido.situacao === "Cadastrado" && pedido.paciente)) && (
          <div className="list-item__actions" style={{ flexWrap: "wrap" }}>
            {pedido.situacao === "Aguardando" && (
              <Button size="sm" variant="primary" icon={CalendarCheck} onClick={() => onConfirmar(pedido)}>
                Confirmar visita
              </Button>
            )}
            {pedido.situacao === "Confirmado" && (
              <>
                <Button size="sm" variant="primary" icon={UserPlus} onClick={() => onIncluir(pedido)}>
                  Incluir na equipe
                </Button>
                <Button size="sm" icon={CalendarClock} onClick={() => onConfirmar(pedido)}>
                  Remarcar
                </Button>
              </>
            )}
            {andamento && whatsapp && (
              <a className="btn btn--sm" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                WhatsApp
              </a>
            )}
            {andamento && (
              <Button size="sm" variant="ghost" className="btn--danger-text" onClick={() => onCancelar(pedido)}>
                {pedido.situacao === "Aguardando" ? "Recusar" : "Cancelar"}
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
      toast.sucesso(`Visita de ${pedido.nome} confirmada para ${exibirData(`${data}T00:00:00Z`)}.`);
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <FormDialog
      open
      title={pedido.situacao === "Confirmado" ? "Remarcar visita" : "Confirmar visita"}
      description={
        <>
          <strong>{pedido.nome}</strong> pediu {exibirData(pedido.dataPreferida)}, {pedido.periodoPreferido?.toLowerCase()}. Combine com o
          paciente pelo telefone {exibirTelefone(pedido.telefone)} se precisar mudar.
        </>
      }
      submitLabel={pedido.situacao === "Confirmado" ? "Salvar nova data" : "Confirmar visita"}
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
      toast.sucesso(recusa ? "Pedido recusado." : "Visita cancelada.");
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
      title={recusa ? "Recusar pedido?" : "Cancelar visita?"}
      description={<>O pedido de <strong>{pedido.nome}</strong> será encerrado. O paciente verá o motivo na área do paciente.</>}
      submitLabel={recusa ? "Recusar pedido" : "Cancelar visita"}
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

function Agendamentos() {
  const { user } = useAuth();
  const toast = useToast();
  const supervisor = user?.role === "supervisor";
  const [params, setParams] = useSearchParams();
  const filtro = FILTROS.includes(params.get("situacao")) ? params.get("situacao") : "Aguardando";

  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState(null);
  const [cancelando, setCancelando] = useState(null);
  const [incluindo, setIncluindo] = useState(null);
  const [salvandoInclusao, setSalvandoInclusao] = useState(false);

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

  const contagem = useMemo(() => {
    const c = Object.fromEntries(FILTROS.map((f) => [f, 0]));
    for (const p of pedidos) c[p.situacao] = (c[p.situacao] || 0) + 1;
    return c;
  }, [pedidos]);

  const visiveis = useMemo(() => {
    const lista = pedidos.filter((p) => p.situacao === filtro);
    // Em andamento: a data mais próxima primeiro. Encerrados: os mais recentes primeiro.
    if (filtro === "Aguardando") return lista.sort((a, b) => new Date(a.dataPreferida) - new Date(b.dataPreferida));
    if (filtro === "Confirmado") return lista.sort((a, b) => new Date(a.dataAgendada) - new Date(b.dataAgendada));
    return lista;
  }, [pedidos, filtro]);

  const fecharEAtualizar = () => {
    setConfirmando(null);
    setCancelando(null);
    carregar();
  };

  const incluir = async () => {
    setSalvandoInclusao(true);
    try {
      await api.put(`/agendamentos/${incluindo._id}`, { acao: "cadastrar" });
      toast.sucesso(`${incluindo.nome} incluído na lista da equipe ${incluindo.equipe}.`);
      setIncluindo(null);
      carregar();
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setSalvandoInclusao(false);
    }
  };

  const vazio = {
    Aguardando: ["Nenhum pedido novo", "Quando um paciente pedir cadastro pela área do paciente, o pedido aparece aqui."],
    Confirmado: ["Nenhuma visita confirmada", supervisor ? "Nenhuma equipe tem visitas de cadastro marcadas." : "Sua equipe não tem visitas de cadastro marcadas."],
    Cadastrado: ["Nenhum cadastro concluído", "Pedidos incluídos na lista de uma equipe aparecem aqui."],
    Cancelado: ["Nenhum pedido cancelado", ""],
  }[filtro];

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/dashboard" }, { label: "Pedidos de cadastro" }]}
        title="Pedidos de cadastro"
        description={
          supervisor
            ? "Pacientes que pediram cadastro pela área do paciente. Confirme a visita, depois inclua o paciente na lista da equipe."
            : "Pacientes da sua microárea que pediram cadastro pela área do paciente. Combine a visita, confirme a data e, depois da visita, inclua o paciente na lista da equipe."
        }
      />

      <div className="stack">
        <div className="chips" role="group" aria-label="Filtrar pedidos por situação">
          {FILTROS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filtro === f} onClick={() => setParams({ situacao: f }, { replace: true })}>
              {SITUACOES_AGENDAMENTO[f].curto}
              <span className="chip__count">{(contagem[f] || 0).toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>

        {filtro === "Aguardando" && !supervisor && contagem.Aguardando > 0 && (
          <Alert type="info">
            Aqui aparecem os pedidos da sua microárea, definida pelo CEP do paciente, e os de microáreas da equipe {user?.equipe} que ainda não têm ACS definido.
          </Alert>
        )}

        {erro && (
          <Alert type="danger" action={<Button size="sm" onClick={carregar}>Tentar de novo</Button>}>
            {erro}
          </Alert>
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
            <ul className="list" aria-label={`Pedidos: ${SITUACOES_AGENDAMENTO[filtro].curto}`}>
              {visiveis.map((p) => (
                <Pedido key={p._id} pedido={p} nomeAgente={user?.nome} onConfirmar={setConfirmando} onIncluir={setIncluindo} onCancelar={setCancelando} />
              ))}
            </ul>
          </div>
        )}

        {filtro === "Cadastrado" && visiveis.length > 0 && (
          <p className="field__hint">
            Depois de incluídos, os pacientes ficam na lista da equipe como <Link to="/relatorios/status/Pendencias">pendentes de visita</Link>.
          </p>
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

      <ConfirmDialog
        open={!!incluindo}
        title="Incluir paciente na equipe?"
        confirmLabel="Incluir na equipe"
        loading={salvandoInclusao}
        onConfirm={incluir}
        onCancel={() => setIncluindo(null)}
      >
        {incluindo && (
          <>
            <strong>{incluindo.nome}</strong> entra na lista da equipe {incluindo.equipe} com os dados que informou, tendo {incluindo.responsavel} como
            responsável. Você pode corrigir qualquer dado depois, no cadastro do paciente.
          </>
        )}
      </ConfirmDialog>
    </AppLayout>
  );
}

export default Agendamentos;
