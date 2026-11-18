"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarX2, Check, Clock, Copy, Inbox, MessageCircle, MessageSquare, Phone, Repeat, Stethoscope, Undo2, UserRound } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { Alert, Button, EmptyState, PageHeader, Skeleton } from "../components/ui";
import { useToast } from "../components/feedback";
import { exibirData, exibirDataHora, hojeNoFuso } from "../utils/agendamento";
import { MOTIVOS_FALTA, PROFISSIONAIS_CONSULTA, quandoConsulta, somarDias } from "../utils/avisosConsulta";
import { exibirTelefone, hrefTelefone, linkWhatsApp, plural, primeiroNome, rotuloMicroarea } from "../utils/formatos";

const dia = (a) => String(a.dataConsulta).slice(0, 10);

const FILTROS = [
  { chave: "repassar", rotulo: "Para repassar", testa: (a, hoje) => a.repasse === "pendente" && dia(a) >= hoje },
  { chave: "naoVao", rotulo: "Não vão", testa: (a, hoje) => a.resposta === "nao_vou" && dia(a) >= hoje },
  { chave: "vao", rotulo: "Vão comparecer", testa: (a, hoje) => a.resposta === "vou" && dia(a) >= hoje },
  { chave: "todos", rotulo: "Todos", testa: () => true },
];

const VAZIO = {
  repassar: ["Nada para repassar", "Quando um paciente avisar pelo portal que não vai à consulta, o aviso aparece aqui."],
  naoVao: ["Nenhuma falta avisada", "Os pacientes que avisarem que não vão à consulta aparecem aqui."],
  vao: ["Nenhuma confirmação", "Os pacientes que confirmarem presença pelo portal aparecem aqui."],
  todos: ["Nenhum aviso", "Os pacientes avisam em \"Vou à minha consulta?\", na área do paciente."],
};

function Linha({ icone: Icone, children }) {
  return (
    <span className="list-item__meta-row">
      <Icone aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** "Hoje", "Amanhã" ou nada: o que é urgente salta aos olhos. */
function prazo(a, hoje) {
  if (dia(a) === hoje) return "Hoje";
  if (dia(a) === somarDias(hoje, 1)) return "Amanhã";
  return "";
}

function TagResposta({ aviso }) {
  if (aviso.resposta === "vou" && aviso.repasse !== "nao_precisa") {
    return (
      <span className="tag" data-status="caminho">
        <Repeat aria-hidden="true" />
        Mudou de ideia: vai
      </span>
    );
  }
  const naoVou = aviso.resposta === "nao_vou";
  return (
    <span className="tag" data-status={naoVou ? "ausente" : "realizada"}>
      {naoVou ? <CalendarX2 aria-hidden="true" /> : <CalendarCheck aria-hidden="true" />}
      {naoVou ? "Não vai" : "Vai"}
    </span>
  );
}

function mensagemWhatsApp(aviso, nomeAgente) {
  const ola = `Olá, ${primeiroNome(aviso.nome)}! Aqui é ${nomeAgente ? `${primeiroNome(nomeAgente)}, ` : ""}da equipe ${aviso.equipe}.`;
  const quando = quandoConsulta(aviso, exibirData);
  return aviso.resposta === "nao_vou"
    ? `${ola} Recebi seu aviso de que não vai à consulta de ${quando}. Já passei para a equipe. Quer que eu veja um novo horário para você?`
    : `${ola} Recebi sua confirmação para a consulta de ${quando}. Até lá!`;
}

/** Texto para colar no grupo da equipe: só o que precisa de ajuste. */
function textoParaEquipe(avisos) {
  const linhas = avisos.map((a) => {
    const acao = a.resposta === "nao_vou" ? "NÃO VAI, liberar vaga" : "MUDOU DE IDEIA, vai comparecer";
    const motivo = a.resposta === "nao_vou" && a.motivo ? ` (${MOTIVOS_FALTA[a.motivo]})` : "";
    return `• ${exibirData(a.dataConsulta, { weekday: "short", day: "2-digit", month: "2-digit" })}${a.horario ? ` ${a.horario}` : ""} · ${
      PROFISSIONAIS_CONSULTA[a.profissional]
    } · ${a.nome}: ${acao}${motivo}`;
  });
  return `Avisos de consulta dos pacientes (área do paciente):\n${linhas.join("\n")}`;
}

function Aviso({ aviso, hoje, nomeAgente, ocupado, onRepassar, onDesfazer }) {
  const tel = hrefTelefone(aviso.telefone);
  const whatsapp = linkWhatsApp(aviso.telefone, mensagemWhatsApp(aviso, nomeAgente));
  const passou = dia(aviso) < hoje;
  const urgente = prazo(aviso, hoje);
  const avisadoEm = exibirDataHora(aviso.atualizadoEm);
  const repassadoEm = exibirDataHora(aviso.repassadoEm);

  return (
    <li className="list-item">
      <div className="list-item__main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="list-item__title">{aviso.nome}</span>
          <TagResposta aviso={aviso} />
          {urgente && aviso.repasse === "pendente" && (
            <span className="tag" data-status="ausente">
              <Clock aria-hidden="true" />
              {urgente}
            </span>
          )}
          <span className="tag">
            Equipe {aviso.equipe}
            {aviso.microarea ? ` · ${rotuloMicroarea(aviso.microarea)}` : ""}
          </span>
        </div>

        <div className="list-item__meta">
          <Linha icone={Stethoscope}>
            <strong>
              Consulta: {quandoConsulta(aviso, exibirData)} · {PROFISSIONAIS_CONSULTA[aviso.profissional]}
            </strong>
            {passou && " · já passou"}
          </Linha>
          {aviso.resposta === "nao_vou" && (aviso.motivo || aviso.observacao) && (
            <Linha icone={MessageSquare}>
              {aviso.motivo ? MOTIVOS_FALTA[aviso.motivo] : "Sem motivo"}
              {aviso.observacao && `: “${aviso.observacao}”`}
            </Linha>
          )}
          {aviso.resposta === "vou" && aviso.repasse === "pendente" && (
            <Linha icone={Repeat}>
              <strong>Tinha avisado que não ia e a equipe já sabia. Agora vai: avise a equipe para manter a vaga.</strong>
            </Linha>
          )}
          <span className="list-item__meta-row">
            <Phone aria-hidden="true" />
            {tel ? <a href={tel}>{exibirTelefone(aviso.telefone)}</a> : <span>{exibirTelefone(aviso.telefone) || "Sem telefone"}</span>}
            {aviso.acs && (
              <>
                <span aria-hidden="true">·</span>
                <span>ACS {aviso.acs}</span>
              </>
            )}
          </span>
          <Linha icone={UserRound}>
            Avisado pelo paciente em {avisadoEm.dia} às {avisadoEm.hora}
            {aviso.repasse === "feito" && ` · repassado por ${aviso.repassadoPor || "ACS"} em ${repassadoEm.dia} às ${repassadoEm.hora}`}
          </Linha>
        </div>

        {(aviso.repasse !== "nao_precisa" || whatsapp) && !passou && (
          <div className="list-item__actions" style={{ flexWrap: "wrap" }}>
            {aviso.repasse === "pendente" && (
              <Button size="sm" variant="primary" icon={Check} loading={ocupado} loadingText="Salvando…" onClick={() => onRepassar(aviso)}>
                Repassei para a equipe
              </Button>
            )}
            {whatsapp && (
              <a className="btn btn--sm" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                WhatsApp
              </a>
            )}
            {aviso.repasse === "feito" && (
              <Button size="sm" variant="ghost" icon={Undo2} disabled={ocupado} onClick={() => onDesfazer(aviso)}>
                Desfazer repasse
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function AvisosConsulta() {
  const { user } = useAuth();
  const toast = useToast();
  const supervisor = user?.role === "supervisor";
  const hoje = hojeNoFuso();
  const [avisos, setAvisos] = useState(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("repassar");
  const [ocupado, setOcupado] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    try {
      setAvisos(await api.get("/avisos-consulta"));
    } catch (err) {
      setErro(err.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const contagem = useMemo(() => Object.fromEntries(FILTROS.map((f) => [f.chave, (avisos || []).filter((a) => f.testa(a, hoje)).length])), [avisos, hoje]);
  const aba = FILTROS.find((f) => f.chave === filtro);
  const visiveis = useMemo(() => (avisos || []).filter((a) => aba.testa(a, hoje)), [avisos, aba, hoje]);
  const pendentes = useMemo(() => (avisos || []).filter((a) => FILTROS[0].testa(a, hoje)), [avisos, hoje]);
  const urgentes = pendentes.filter((a) => prazo(a, hoje)).length;

  const agir = async (aviso, acao) => {
    setOcupado(aviso._id);
    try {
      const r = await api.put(`/avisos-consulta/${aviso._id}`, { acao });
      setAvisos((lista) => lista.map((a) => (a._id === aviso._id ? r.aviso : a)));
      toast.sucesso(acao === "repassar" ? `Repasse de ${primeiroNome(aviso.nome)} registrado.` : "Repasse desfeito.");
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setOcupado("");
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoParaEquipe(pendentes));
      toast.sucesso("Lista copiada. Cole no grupo da equipe e depois marque cada um como repassado.");
    } catch {
      toast.erro("Não foi possível copiar. Repasse os avisos um a um.");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/dashboard" }, { label: "Avisos de consulta" }]}
        title="Avisos de consulta"
        description={
          supervisor
            ? "Pacientes que avisaram pela área do paciente se vão ou não à consulta marcada. Quem não vai libera a vaga para outro paciente."
            : `Pacientes da equipe ${user?.equipe || ""} que avisaram pela área do paciente se vão ou não à consulta. Passe para a equipe quem não vai, para a vaga ir para outro paciente, e marque como repassado.`
        }
      />

      <div className="stack">
        <div className="chips" role="group" aria-label="Filtrar avisos">
          {FILTROS.map((f) => (
            <button key={f.chave} type="button" className="chip" aria-pressed={filtro === f.chave} onClick={() => setFiltro(f.chave)}>
              {f.rotulo}
              <span className="chip__count">{(contagem[f.chave] || 0).toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>

        {erro && (
          <Alert type="danger" action={<Button size="sm" onClick={carregar}>Tentar de novo</Button>}>
            {erro}
          </Alert>
        )}

        {filtro === "repassar" && pendentes.length > 0 && (
          <Alert
            type={urgentes > 0 ? "warning" : "info"}
            title={
              urgentes > 0
                ? `${plural(urgentes, "aviso", "avisos")} para hoje ou amanhã`
                : `${plural(pendentes.length, "aviso", "avisos")} para repassar`
            }
            action={
              <Button size="sm" icon={Copy} onClick={copiar}>
                Copiar lista para a equipe
              </Button>
            }
          >
            Passe para a equipe e marque &ldquo;Repassei&rdquo;. O paciente vê no portal que a equipe já foi avisada.
          </Alert>
        )}

        {!avisos && !erro ? (
          <div className="paper list-paper" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ padding: 16, borderTop: i ? "1px solid var(--gray-90)" : 0, display: "grid", gap: 8 }}>
                <Skeleton width="45%" height={16} />
                <Skeleton width="75%" height={12} />
              </div>
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          !erro && (
            <div className="paper">
              <EmptyState icon={Inbox} title={VAZIO[filtro][0]}>
                {VAZIO[filtro][1]}
              </EmptyState>
            </div>
          )
        ) : (
          <div className="paper list-paper">
            <div className="list-paper__head">
              <span>{plural(visiveis.length, "aviso", "avisos")}</span>
            </div>
            <ul className="list" aria-label={`Avisos: ${aba.rotulo}`}>
              {visiveis.map((a) => (
                <Aviso
                  key={a._id}
                  aviso={a}
                  hoje={hoje}
                  nomeAgente={user?.nome}
                  ocupado={ocupado === a._id}
                  onRepassar={(x) => agir(x, "repassar")}
                  onDesfazer={(x) => agir(x, "desfazer")}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AvisosConsulta;
