"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BellRing, Clock, ExternalLink, History, MessageCircle, RotateCw } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { Alert, Button, PageHeader, Section, Skeleton } from "../components/ui";
import { AvisoFuncionamento, CartaoSetor, ICONES_SETOR, PainelFuncionamento, haQuanto, useAgora } from "../components/Funcionamento";
import {
  ConfigurarHorario,
  EditorFaltas,
  EditorMovimento,
  EditorRecado,
  EditorSituacao,
  EditorUrgencia,
  RegistrosDoDia,
  movimentoValido,
  useSalvarSetor,
} from "../components/EdicaoSetor";
import { UNIDADE } from "../constants/unidade";
import { MOVIMENTOS, SETORES, SITUACOES_VAGA, URGENCIAS, estadoDoSetor, registroDeHoje, relogio, resumoParaWhatsApp, textoHorario } from "../utils/setores";

/** Busca os setores (com `podeEditar` para a conta logada) e acompanha o que os outros atualizam. */
function useSetores() {
  const [setores, setSetores] = useState(null);
  const [erro, setErro] = useState("");
  const carregar = useCallback(() => {
    api
      .get("/setores")
      .then((r) => {
        setSetores(r.setores);
        setErro("");
      })
      .catch((err) => setErro(err.message));
  }, []);
  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 120000);
    return () => clearInterval(id);
  }, [carregar]);
  const atualizar = (novo) => setSetores((lista) => lista.map((s) => (s.chave === novo.chave ? novo : s)));
  return { setores, erro, carregar, atualizar };
}

/** Dentro do horário cadastrado agora? (null quando o setor não tem horário) */
function dentroDoHorario(setor, agora) {
  const h = setor.horario;
  if (!h?.turnos?.length || !h?.dias?.length) return null;
  const r = relogio(agora);
  return h.dias.includes(r.dia) && h.turnos.some((t) => t.abre <= r.hora && r.hora < t.fecha);
}

function Indicador({ rotulo, valor, detalhe, tom }) {
  return (
    <div className="paper painel-indicador" data-tom={tom}>
      <span className="painel-indicador__rotulo">{rotulo}</span>
      <span className="painel-indicador__valor">{valor}</span>
      {detalhe && <span className="painel-indicador__detalhe">{detalhe}</span>}
    </div>
  );
}

/* ───────────────────────── Painel da conta de setor ───────────────────────── */

function PainelDoSetor({ setor, agora, onAtualizado }) {
  const def = SETORES[setor.chave];
  const { salvar, ocupado } = useSalvarSetor(setor.chave, onAtualizado);
  const hoje = registroDeHoje(setor, agora);
  const estado = estadoDoSetor(setor, agora);
  const mov = movimentoValido(hoje, agora);
  const dentro = dentroDoHorario(setor, agora);
  const horario = textoHorario(setor);
  const faltas = setor.faltas || [];

  // Lembretes para a informação não ficar velha.
  const lembretes = [];
  if (!hoje && dentro !== false) lembretes.push(def.tipo === "vaga" ? "Comece o dia: confirme se o atendimento está disponível." : "Comece o dia: informe se o setor está aberto e como está o movimento.");
  if (def.tipo === "setor" && hoje?.situacao === "aberto" && hoje.movimento && !mov && dentro !== false)
    lembretes.push("O movimento informado passou de 1 hora e saiu do portal. Toque de novo em tranquilo, moderado ou cheio.");

  // Indicadores do topo, conforme as funções do setor.
  const indicadores = [
    { rotulo: "O paciente vê agora", valor: estado.titulo, detalhe: estado.detalhe, tom: estado.tom },
    def.tipo === "vaga"
      ? { rotulo: "Atendimento do dia", valor: SITUACOES_VAGA[hoje?.situacao || "disponivel"], detalhe: `${def.vagasPorDia} por dia`, tom: hoje?.situacao === "realizado" ? "alerta" : hoje?.situacao === "sem_atendimento" ? "fechado" : "ok" }
      : { rotulo: "Movimento", valor: mov ? MOVIMENTOS[mov].replace("Movimento ", "") : "Não informado", detalhe: mov ? `informado ${haQuanto(hoje.movimentoEm, agora)}` : "vale por 1 hora", tom: mov === "cheio" ? "fechado" : mov === "moderado" ? "alerta" : mov ? "ok" : "neutro" },
    def.urgencia && { rotulo: "Urgência", valor: hoje?.urgencia ? URGENCIAS[hoje.urgencia].replace("Urgência: ", "") : "Não informada", tom: hoje?.urgencia === "atendendo" ? "ok" : hoje?.urgencia ? "alerta" : "neutro" },
    def.faltas && { rotulo: def.faltas, valor: faltas.length === 0 ? "Nenhum" : `${faltas.length} ${faltas.length === 1 ? "item" : "itens"}`, detalhe: faltas.slice(0, 3).map((f) => f.nome).join(", ") + (faltas.length > 3 ? "…" : ""), tom: faltas.length ? "alerta" : "ok" },
    { rotulo: "Última atualização", valor: hoje?.atualizadoEm ? haQuanto(hoje.atualizadoEm, agora) : "Nenhuma hoje", detalhe: hoje?.atualizadoPor, tom: "neutro" },
  ].filter(Boolean);

  return (
    <div className="stack">
      {lembretes.map((l) => (
        <Alert key={l} type="warning" title="Lembrete">
          {l}
        </Alert>
      ))}

      <div className="painel-indicadores">
        {indicadores.map((i) => (
          <Indicador key={i.rotulo} {...i} />
        ))}
      </div>

      <Section
        title={def.tipo === "vaga" ? "Atendimento do dia" : "Situação do setor"}
        description={
          def.tipo === "vaga"
            ? "Quando o atendimento do dia for feito, toque em \"já realizado\". No próximo dia útil volta a \"disponível\" sozinho."
            : "Um toque já publica no portal. Se fechar por um tempo, informe o motivo e a hora de volta."
        }
      >
        <EditorSituacao setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} rotulo={null} grande />
      </Section>

      {def.tipo === "setor" && (
        <Section title="Movimento agora" description="Ajuda o paciente a escolher a melhor hora de ir.">
          <EditorMovimento setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} rotulo={null} grande />
        </Section>
      )}

      {def.urgencia && (
        <Section title="Urgência odontológica" description="As consultas são marcadas; a urgência é por ordem de chegada.">
          <EditorUrgencia setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} rotulo={null} grande />
        </Section>
      )}

      {def.faltas && (
        <Section title={def.faltas} description="Aparece no portal para o paciente não perder a viagem.">
          <EditorFaltas setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} />
        </Section>
      )}

      <Section title="Recado do dia">
        <EditorRecado key={hoje?.recado || ""} setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} />
      </Section>

      <div className="painel-duas-colunas">
        <Section
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <History aria-hidden="true" style={{ width: 18, height: 18 }} />
              Atualizações de hoje
            </span>
          }
        >
          <RegistrosDoDia setor={setor} />
        </Section>
        <Section
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Clock aria-hidden="true" style={{ width: 18, height: 18 }} />
              Horário do setor
            </span>
          }
          description="Definido pelo supervisor. Fora deste horário o portal mostra o setor fechado."
        >
          <p style={{ margin: 0 }}>{horario || "Ainda não cadastrado. Peça ao supervisor para cadastrar o horário."}</p>
          {setor.acesso && (
            <p className="field__hint" style={{ marginBottom: 0 }}>
              {setor.acesso}
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function TelaContaSetor({ setores, agora, atualizar }) {
  const meus = setores.filter((s) => s.podeEditar);
  const [ativo, setAtivo] = useState(meus[0]?.chave);
  const setor = meus.find((s) => s.chave === ativo) || meus[0];

  if (!setor) {
    return <Alert type="warning">Esta conta não tem setores. Peça ao supervisor para escolher o setor em Gerenciar usuários.</Alert>;
  }
  const Icone = ICONES_SETOR[setor.chave];
  return (
    <>
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <Icone aria-hidden="true" style={{ width: 28, height: 28 }} />
            Painel · {SETORES[setor.chave].rotulo}
          </span>
        }
        description="Informe como o setor está agora. Cada toque aparece na hora para os pacientes no portal, para evitar viagem perdida e fila."
        actions={
          <a className="btn" href="/paciente/unidade" target="_blank" rel="noopener noreferrer">
            Ver como o paciente vê
            <ExternalLink aria-hidden="true" />
          </a>
        }
      />
      {meus.length > 1 && (
        <div className="chips mb-section" role="group" aria-label="Escolher o setor">
          {meus.map((s) => (
            <button key={s.chave} type="button" className="chip" aria-pressed={s.chave === setor.chave} onClick={() => setAtivo(s.chave)}>
              {SETORES[s.chave].rotulo}
              <span className="chip__count">{estadoDoSetor(s, agora).titulo}</span>
            </button>
          ))}
        </div>
      )}
      <PainelDoSetor key={setor.chave} setor={setor} agora={agora} onAtualizado={atualizar} />
    </>
  );
}

/* ───────────────────────── Visão do supervisor e do ACS ───────────────────────── */

function EditorSupervisor({ setor, agora, onAtualizado }) {
  const def = SETORES[setor.chave];
  const Icone = ICONES_SETOR[setor.chave];
  const { salvar, ocupado } = useSalvarSetor(setor.chave, onAtualizado);
  const hoje = registroDeHoje(setor, agora);
  return (
    <Section
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icone aria-hidden="true" style={{ width: 22, height: 22 }} />
          {def.rotulo}
        </span>
      }
      description={hoje?.atualizadoEm ? `Atualizado ${haQuanto(hoje.atualizadoEm, agora)} por ${hoje.atualizadoPor}` : "Ainda não atualizado hoje. Sem atualização, o portal usa o horário cadastrado."}
    >
      <div className="stack" style={{ gap: "var(--space-5)" }}>
        <ul className="setor-lista" aria-label={`Prévia de ${def.rotulo}`}>
          <CartaoSetor setor={setor} agora={agora} compacto />
        </ul>
        <EditorSituacao setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} />
        {def.tipo === "setor" && <EditorMovimento setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} />}
        {def.urgencia && <EditorUrgencia setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} />}
        {def.faltas && <EditorFaltas setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} />}
        <EditorRecado key={hoje?.recado || ""} setor={setor} agora={agora} salvar={salvar} ocupado={ocupado} />
        <details className="rastreio-detalhes">
          <summary>Atualizações de hoje</summary>
          <RegistrosDoDia setor={setor} />
        </details>
        <ConfigurarHorario setor={setor} salvar={salvar} ocupado={ocupado} />
      </div>
    </Section>
  );
}

function Funcionamento() {
  const { user } = useAuth();
  const supervisor = user?.role === "supervisor";
  const contaSetor = user?.role === "setor";
  const agora = useAgora();
  const { setores, erro, carregar, atualizar } = useSetores();
  const whatsapp = setores ? `https://wa.me/?text=${encodeURIComponent(resumoParaWhatsApp(setores, UNIDADE.nome, agora))}` : null;

  const carregando = !setores && !erro && (
    <div className="paper" style={{ padding: 16, display: "grid", gap: 12 }} aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={48} />
      ))}
    </div>
  );
  const falha = erro && (
    <Alert type="danger" action={<Button size="sm" icon={RotateCw} onClick={carregar}>Tentar de novo</Button>}>
      {erro}
    </Alert>
  );

  if (contaSetor) {
    return (
      <AppLayout>
        {falha}
        {carregando}
        {setores && <TelaContaSetor setores={setores} agora={agora} atualizar={atualizar} />}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/dashboard" }, { label: "Funcionamento da unidade" }]}
        title="Funcionamento da unidade"
        description={
          supervisor
            ? "O que os pacientes veem no portal sobre farmácia, laboratório, odontologia, vacinação e IPE. Cada setor atualiza pelo próprio login; você também pode atualizar e cadastrar o horário."
            : "O que os pacientes veem no portal. Use para orientar as famílias antes de irem à unidade."
        }
        actions={
          whatsapp ? (
            <a className="btn" href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              Enviar resumo pelo WhatsApp
            </a>
          ) : null
        }
      />
      <div className="stack">
        {falha}
        {carregando}
        {setores && (
          <>
            <Section
              title="Como o paciente vê agora"
              footer={
                <a className="btn btn--ghost btn--primary-text" href="/paciente/unidade" target="_blank" rel="noopener noreferrer">
                  Abrir a página do paciente
                  <ExternalLink aria-hidden="true" />
                </a>
              }
            >
              <PainelFuncionamento setores={setores} agora={agora} />
              <AvisoFuncionamento />
            </Section>
            {supervisor && (
              <Alert type="info" title="Logins dos setores">
                <BellRing aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: "-3px", marginRight: 4 }} />
                Crie um login para cada setor em Configurações › Gerenciar usuários (tipo de conta Farmácia, Laboratório, Odontologia, Vacinação ou
                Atendimento IPE). Cada login abre direto no painel do seu setor.
              </Alert>
            )}
            {supervisor && setores.map((s) => <EditorSupervisor key={s.chave} setor={s} agora={agora} onAtualizado={atualizar} />)}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Funcionamento;
