"use client";

import React, { useState } from "react";
import { Check, PackageCheck, Plus, Save } from "lucide-react";
import api from "../services/api";
import { Button, Field } from "./ui";
import { useToast } from "./feedback";
import { haQuanto } from "./Funcionamento";
import { DIAS_SEMANA, HORAS, MOTIVOS_FECHAMENTO, MOVIMENTOS, SETORES, SITUACOES_SETOR, SITUACOES_VAGA, URGENCIAS, registroDeHoje, relogio } from "../utils/setores";

/** Tom de cada botão (mesmas cores do portal). */
export const TOM_SITUACAO = { aberto: "ok", disponivel: "ok", encerrado: "alerta", realizado: "alerta", fechado: "fechado", sem_atendimento: "fechado" };
export const TOM_MOVIMENTO = { tranquilo: "ok", moderado: "alerta", cheio: "fechado" };
export const TOM_URGENCIA = { atendendo: "ok", esgotada: "alerta", sem: "fechado" };

/** Rótulos dos botões do IPE, mais diretos para quem atende. */
const BOTOES_VAGA = { disponivel: "Atendimento disponível", realizado: "Atendimento do dia já realizado", sem_atendimento: "Sem atendimento hoje" };

/** Salva uma atualização do setor e devolve o setor atualizado. */
export function useSalvarSetor(chave, onAtualizado) {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  const salvar = async (body, mensagem = "Atualizado. O portal já mostra a mudança.") => {
    setOcupado(true);
    try {
      const r = await api.put(`/setores/${chave}`, body);
      onAtualizado(r.setor);
      toast.sucesso(mensagem);
      return true;
    } catch (err) {
      toast.erro(err.message);
      return false;
    } finally {
      setOcupado(false);
    }
  };
  return { salvar, ocupado };
}

/** Movimento ainda válido (informado há no máximo 1 hora). */
export function movimentoValido(hoje, agora) {
  return hoje?.movimento && hoje.movimentoEm && agora - new Date(hoje.movimentoEm) <= 3600000 ? hoje.movimento : null;
}

/** Grupo de botões grandes: um toque já salva. */
export function Opcoes({ rotulo, dica, opcoes, valor, tons, onEscolher, ocupado, grande = false }) {
  return (
    <fieldset className="fieldset field">
      {rotulo && <legend className="field__label">{rotulo}</legend>}
      {dica && (
        <p className="field__hint" style={{ marginTop: 0 }}>
          {dica}
        </p>
      )}
      <div className={`opcoes-setor${grande ? " opcoes-setor--grande" : ""}`}>
        {Object.entries(opcoes).map(([chave, texto]) => (
          <button
            key={chave}
            type="button"
            className="opcao-setor"
            data-tom={tons[chave]}
            aria-pressed={valor === chave}
            disabled={ocupado}
            onClick={() => onEscolher(chave)}
          >
            {valor === chave && <Check aria-hidden="true" strokeWidth={3} />}
            {texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Situação do setor agora; "fechado" e "sem atendimento" pedem motivo (e hora de volta). */
export function EditorSituacao({ setor, agora, salvar, ocupado, rotulo = "Situação agora", grande = false }) {
  const def = SETORES[setor.chave];
  const hoje = registroDeHoje(setor, agora);
  const [pendente, setPendente] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [voltaAs, setVoltaAs] = useState("");
  const id = `situacao-${setor.chave}`;

  const escolher = (situacao) => {
    if (situacao === "fechado" || situacao === "sem_atendimento") {
      setPendente(situacao);
      setMotivo(hoje?.situacao === situacao ? hoje.motivo || "" : "");
      setVoltaAs(hoje?.situacao === situacao ? hoje.voltaAs || "" : "");
      return;
    }
    setPendente(null);
    salvar({ acao: "hoje", situacao });
  };

  return (
    <div className="stack" style={{ gap: "var(--space-3)" }}>
      <Opcoes
        rotulo={rotulo}
        opcoes={def.tipo === "vaga" ? BOTOES_VAGA : SITUACOES_SETOR}
        valor={pendente || hoje?.situacao}
        tons={TOM_SITUACAO}
        onEscolher={escolher}
        ocupado={ocupado}
        grande={grande}
      />
      {pendente && (
        <div className="paper" style={{ padding: "var(--space-4)", background: "var(--color-bg)" }}>
          <div className="form-grid">
            <Field className="span-3" label="Motivo" optional htmlFor={`${id}-motivo`} hint="O paciente vê o motivo.">
              {(props) => (
                <select {...props} className="select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  <option value="">Não informar</option>
                  {Object.entries(MOTIVOS_FECHAMENTO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {pendente === "fechado" && (
              <Field className="span-3" label="Volta às" optional htmlFor={`${id}-volta`} hint="Na hora marcada o portal volta a mostrar aberto.">
                {(props) => (
                  <select {...props} className="select" value={voltaAs} onChange={(e) => setVoltaAs(e.target.value)}>
                    <option value="">Sem previsão</option>
                    {HORAS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                variant="primary"
                loading={ocupado}
                loadingText="Salvando…"
                onClick={async () => {
                  if (await salvar({ acao: "hoje", situacao: pendente, motivo, voltaAs })) setPendente(null);
                }}
              >
                Confirmar: {SITUACOES_SETOR[pendente] || SITUACOES_VAGA[pendente]}
              </Button>
              <Button variant="ghost" onClick={() => setPendente(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EditorMovimento({ setor, agora, salvar, ocupado, grande = false, rotulo = "Movimento agora" }) {
  return (
    <Opcoes
      rotulo={rotulo}
      dica="Vale por 1 hora. Informar o movimento já marca o setor como aberto."
      opcoes={MOVIMENTOS}
      valor={movimentoValido(registroDeHoje(setor, agora), agora)}
      tons={TOM_MOVIMENTO}
      onEscolher={(movimento) => salvar({ acao: "hoje", movimento })}
      ocupado={ocupado}
      grande={grande}
    />
  );
}

export function EditorUrgencia({ setor, agora, salvar, ocupado, grande = false, rotulo = "Urgência hoje" }) {
  return (
    <Opcoes
      rotulo={rotulo}
      dica="A urgência é por ordem de chegada. Marque quando as vagas do dia acabarem."
      opcoes={URGENCIAS}
      valor={registroDeHoje(setor, agora)?.urgencia}
      tons={TOM_URGENCIA}
      onEscolher={(urgencia) => salvar({ acao: "hoje", urgencia })}
      ocupado={ocupado}
      grande={grande}
    />
  );
}

export function EditorRecado({ setor, agora, salvar, ocupado }) {
  const hoje = registroDeHoje(setor, agora);
  const [recado, setRecado] = useState(hoje?.recado || "");
  const id = `recado-${setor.chave}`;
  return (
    <div className="form-grid">
      <Field label="Recado para o paciente" optional htmlFor={id} hint="Vale só hoje. Ex.: atendimento de urgência só à tarde.">
        {(props) => <input {...props} className="input" maxLength={140} value={recado} onChange={(e) => setRecado(e.target.value)} />}
      </Field>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" icon={Save} disabled={ocupado} onClick={() => salvar({ acao: "hoje", recado }, recado.trim() ? "Recado publicado" : "Recado removido")}>
          {recado.trim() ? "Publicar recado" : "Remover recado"}
        </Button>
      </div>
    </div>
  );
}

/** Lista de remédios/vacinas em falta: adiciona um a um e marca "chegou" para tirar. */
export function EditorFaltas({ setor, agora, salvar, ocupado }) {
  const def = SETORES[setor.chave];
  const [nome, setNome] = useState("");
  const id = `faltas-${setor.chave}`;
  const faltas = setor.faltas || [];
  const exemplo = setor.chave === "farmacia" ? "Ex.: Losartana 50 mg" : "Ex.: Febre amarela";

  const adicionar = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    if (await salvar({ acao: "faltaAdicionar", nome }, `"${nome.trim()}" entrou na lista de faltas`)) setNome("");
  };

  return (
    <div className="stack" style={{ gap: "var(--space-3)" }}>
      <form onSubmit={adicionar} className="faltas-form">
        <Field label={`Adicionar a ${def.faltas.toLowerCase()}`} htmlFor={id}>
          {(props) => <input {...props} className="input" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={exemplo} autoComplete="off" />}
        </Field>
        <Button type="submit" variant="primary" icon={Plus} disabled={ocupado || !nome.trim()}>
          Adicionar
        </Button>
      </form>

      {faltas.length === 0 ? (
        <p className="field__hint" style={{ margin: 0 }}>
          Nada em falta no momento. O portal não mostra a lista quando ela está vazia.
        </p>
      ) : (
        <ul className="faltas-lista" aria-label={def.faltas}>
          {faltas.map((f) => (
            <li key={f.nome} className="faltas-item">
              <span>
                <strong>{f.nome}</strong>
                {f.desde && (
                  <span className="field__hint" style={{ display: "block", margin: 0 }}>
                    em falta desde {new Date(f.desde).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
                  </span>
                )}
              </span>
              <Button size="sm" icon={PackageCheck} disabled={ocupado} onClick={() => salvar({ acao: "faltaRemover", nome: f.nome }, `"${f.nome}" saiu da lista de faltas`)}>
                Chegou
              </Button>
            </li>
          ))}
        </ul>
      )}
      {setor.faltasEm && (
        <p className="field__hint" style={{ margin: 0 }}>
          Lista atualizada {haQuanto(setor.faltasEm, agora)}. Continua no portal até você marcar "Chegou".
        </p>
      )}
    </div>
  );
}

/** "Atualizações de hoje" (o que foi informado e por quem). */
export function RegistrosDoDia({ setor }) {
  const inicio = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())}T03:00:00Z`);
  const registros = (setor.registros || []).filter((r) => new Date(r.em) >= inicio);
  if (registros.length === 0) {
    return (
      <p className="field__hint" style={{ margin: 0 }}>
        Nenhuma atualização hoje ainda.
      </p>
    );
  }
  return (
    <ol className="registros-dia">
      {registros.map((r, i) => (
        <li key={i}>
          <span className="num registros-dia__hora">{relogio(new Date(r.em)).hora}</span>
          <span>
            {r.texto}
            {r.por && <span className="field__hint" style={{ display: "block", margin: 0 }}>{r.por}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Horário semanal e "como funciona" (supervisor). */
export function ConfigurarHorario({ setor, salvar, ocupado }) {
  const [dias, setDias] = useState(setor.horario?.dias?.length ? setor.horario.dias : [1, 2, 3, 4, 5]);
  const [turnos, setTurnos] = useState(() => {
    const t = setor.horario?.turnos || [];
    return [t[0] || { abre: "", fecha: "" }, t[1] || { abre: "", fecha: "" }];
  });
  const [acesso, setAcesso] = useState(setor.acesso || SETORES[setor.chave].acesso);
  const id = `cfg-${setor.chave}`;

  const mudarTurno = (i, campo, valor) => setTurnos((ts) => ts.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));
  const seletorHora = (i, campo, rotulo) => (
    <Field key={`${i}-${campo}`} className="span-3" label={rotulo} htmlFor={`${id}-${i}-${campo}`} optional={i === 1}>
      {(props) => (
        <select {...props} className="select" value={turnos[i][campo]} onChange={(e) => mudarTurno(i, campo, e.target.value)}>
          <option value="">—</option>
          {HORAS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <details className="rastreio-detalhes">
      <summary>Horário e como funciona (supervisor)</summary>
      <div className="form-grid">
        <fieldset className="fieldset field">
          <legend className="field__label">Dias de funcionamento</legend>
          <div className="choices">
            {DIAS_SEMANA.map((nomeDia, d) => (
              <label key={nomeDia} className="choice">
                <input type="checkbox" checked={dias.includes(d)} onChange={() => setDias((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))} />
                <span className="choice__check" aria-hidden="true">
                  <Check strokeWidth={3} />
                </span>
                {nomeDia}
              </label>
            ))}
          </div>
        </fieldset>
        {seletorHora(0, "abre", "Abre")}
        {seletorHora(0, "fecha", "Fecha")}
        {seletorHora(1, "abre", "Reabre (2º turno)")}
        {seletorHora(1, "fecha", "Fecha (2º turno)")}
        <Field label="Como funciona" htmlFor={`${id}-acesso`} hint="Aparece para o paciente. Ex.: coleta por ordem de chegada; leve o pedido médico.">
          {(props) => <textarea {...props} className="textarea" rows={2} maxLength={300} value={acesso} onChange={(e) => setAcesso(e.target.value)} />}
        </Field>
        <div>
          <Button
            variant="primary"
            icon={Save}
            disabled={ocupado}
            onClick={() => salvar({ acao: "configurar", horario: { dias, turnos: turnos.filter((t) => t.abre || t.fecha) }, acesso }, "Horário salvo")}
          >
            Salvar horário
          </Button>
        </div>
      </div>
    </details>
  );
}
