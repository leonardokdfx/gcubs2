"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarX2, Check, Trash2, UserX } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { Alert, Button, EmptyState, Field, PageHeader, Section, Skeleton, TeamIcon } from "../components/ui";
import { ConfirmDialog, FormDialog, useToast } from "../components/feedback";
import { ICONES_PROFISSIONAL, PresencaTag, periodoAusencia } from "../components/Presenca";
import { equipesDoUsuario } from "../constants/dominio";
import { exibirData, exibirDataHora, hojeNoFuso } from "../utils/agendamento";
import {
  CHAVES_PROFISSIONAIS,
  DIAS_MAX_AUSENCIA,
  MOTIVOS_AUSENCIA,
  PROFISSIONAIS,
  TURNOS,
  agruparAusencias,
  diaUtil,
  resumoAusencia,
  somarDiasISO,
} from "../utils/presenca";

/** Diálogo do supervisor para lançar uma ausência (um dia ou um período, como férias). */
function LancarAusencia({ alvo, onFechar, onSalvo }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState(alvo.registro?.motivo || "");
  const [turno, setTurno] = useState(alvo.registro?.turno || "Dia todo");
  const [ate, setAte] = useState(alvo.data);
  const [recado, setRecado] = useState(alvo.registro?.recado || "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setErro("");
    if (!motivo) return setErro("Escolha o motivo da ausência.");
    if (ate < alvo.data) return setErro("A data final precisa ser depois da inicial.");
    setSalvando(true);
    try {
      const r = await api.put("/presenca", { equipe: alvo.equipe, profissional: alvo.profissional, data: alvo.data, ate, situacao: "ausente", motivo, turno, recado });
      toast.sucesso(`${PROFISSIONAIS[alvo.profissional].rotulo} da equipe ${alvo.equipe}: ${r.message.toLowerCase()}.`);
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <FormDialog
      open
      title={`${PROFISSIONAIS[alvo.profissional].rotulo} ausente · Equipe ${alvo.equipe}`}
      description="Os pacientes da equipe veem o aviso no portal, com o pedido para procurar a unidade ou o ACS e remarcar a consulta."
      submitLabel="Lançar ausência"
      loading={salvando}
      onSubmit={salvar}
      onCancel={onFechar}
    >
      {erro && <Alert type="danger">{erro}</Alert>}
      <div className="form-grid">
        <Field label="Motivo" required htmlFor="ausencia-motivo" hint="Aparece para o paciente. Não coloque detalhes de saúde do profissional.">
          {(props) => (
            <select {...props} className="select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              <option value="">Selecione</option>
              {Object.entries(MOTIVOS_AUSENCIA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          )}
        </Field>
        <fieldset className="fieldset" style={{ gridColumn: "1 / -1" }}>
          <legend className="field__label">Turno</legend>
          <div className="choices" role="radiogroup">
            {TURNOS.map((t) => (
              <label key={t} className="choice choice--radio">
                <input type="radio" name="ausencia-turno" value={t} checked={turno === t} onChange={() => setTurno(t)} />
                <span className="choice__check" aria-hidden="true" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <Field className="span-3" label="De" htmlFor="ausencia-de">
          {(props) => <input {...props} type="date" className="input" value={alvo.data} disabled />}
        </Field>
        <Field className="span-3" label="Até" htmlFor="ausencia-ate" hint="Para férias ou licença. Sábados e domingos são pulados.">
          {(props) => (
            <input
              {...props}
              type="date"
              className="input"
              min={alvo.data}
              max={somarDiasISO(alvo.data, DIAS_MAX_AUSENCIA - 1)}
              value={ate}
              onChange={(e) => setAte(e.target.value || alvo.data)}
            />
          )}
        </Field>
        <Field label="Recado para os pacientes" optional htmlFor="ausencia-recado" hint="Ex.: Volta a atender na segunda, dia 25.">
          {(props) => <input {...props} className="input" maxLength={200} value={recado} onChange={(e) => setRecado(e.target.value)} />}
        </Field>
      </div>
    </FormDialog>
  );
}

function LinhaProfissional({ equipe, profissional, registro, podeEditar, ocupado, onPresente, onAusente }) {
  const Icone = ICONES_PROFISSIONAL[profissional];
  const situacao = registro?.situacao || "nao_informado";
  const { hora } = exibirDataHora(registro?.atualizadoEm);
  return (
    <li className="presenca-item" data-situacao={situacao}>
      <span className="presenca-item__icone" aria-hidden="true">
        <Icone />
      </span>
      <span className="presenca-item__texto">
        <span className="presenca-item__nome">
          {PROFISSIONAIS[profissional].rotulo} <PresencaTag situacao={situacao} />
        </span>
        <span className="presenca-item__detalhe">
          {situacao === "ausente" && [resumoAusencia(registro), registro.recado && `“${registro.recado}”`].filter(Boolean).join(" · ")}
          {situacao === "nao_informado" && "Ainda não marcado"}
          {registro && (
            <>
              {situacao === "ausente" && " · "}
              Por {registro.registradoPor || "supervisor"}
              {hora && ` às ${hora}`}
            </>
          )}
        </span>
      </span>
      {podeEditar && (
        <span className="presenca-item__acoes">
          <Button
            size="sm"
            icon={Check}
            variant={situacao === "presente" ? "primary" : undefined}
            aria-pressed={situacao === "presente"}
            disabled={ocupado}
            onClick={onPresente}
            aria-label={`Marcar ${PROFISSIONAIS[profissional].rotulo} da equipe ${equipe} como presente`}
          >
            Presente
          </Button>
          <Button
            size="sm"
            icon={UserX}
            className={situacao === "ausente" ? "btn--ausente" : undefined}
            aria-pressed={situacao === "ausente"}
            disabled={ocupado}
            onClick={onAusente}
            aria-label={`Marcar ${PROFISSIONAIS[profissional].rotulo} da equipe ${equipe} como ausente`}
          >
            Ausente
          </Button>
        </span>
      )}
    </li>
  );
}

function Presenca() {
  const { user } = useAuth();
  const toast = useToast();
  const supervisor = user?.role === "supervisor";
  const equipes = equipesDoUsuario(user);
  const hoje = hojeNoFuso();
  const [data, setData] = useState(hoje);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [ausencia, setAusencia] = useState(null);
  const [apagando, setApagando] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      setDados(await api.get(`/presenca?data=${data}`));
    } catch (err) {
      setErro(err.message);
    }
  }, [data]);

  useEffect(() => {
    setDados(null);
    carregar();
  }, [carregar]);

  const util = diaUtil(data);
  const passado = data < hoje;
  const podeEditar = supervisor && util && !passado;
  const proximas = useMemo(() => agruparAusencias(dados?.proximas), [dados]);
  const registroDe = (equipe, profissional) => dados?.dia.find((r) => r.equipe === equipe && r.profissional === profissional);

  const marcarPresente = async (equipe, profissional) => {
    setOcupado(`${equipe}-${profissional}`);
    try {
      await api.put("/presenca", { equipe, profissional, data, situacao: "presente" });
      toast.sucesso(`${PROFISSIONAIS[profissional].rotulo} da equipe ${equipe} presente.`);
      await carregar();
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setOcupado("");
    }
  };

  const apagar = async () => {
    setEnviando(true);
    try {
      await Promise.all(apagando.ids.map((id) => api.delete(`/presenca/${id}`)));
      toast.sucesso("Ausência apagada. O aviso saiu do portal.");
      setApagando(null);
      await carregar();
    } catch (err) {
      toast.erro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Presença dos profissionais"
        description={
          supervisor
            ? "Marque se o médico e o enfermeiro de cada equipe estão atendendo. Na ausência, os pacientes da equipe recebem no portal o aviso para procurar a unidade ou o ACS e remarcar a consulta."
            : "Quem está atendendo na sua equipe. Na ausência, os pacientes veem no portal o aviso para remarcar a consulta na unidade ou com você."
        }
      />

      <div className="stack">
        <div className="presenca-filtro">
          <Field label="Dia" htmlFor="presenca-data">
            {(props) => <input {...props} type="date" className="input" value={data} onChange={(e) => setData(e.target.value || hoje)} suppressHydrationWarning />}
          </Field>
          {data !== hoje && (
            <Button onClick={() => setData(hoje)} suppressHydrationWarning>
              Voltar para hoje
            </Button>
          )}
        </div>

        {erro && <Alert type="danger">{erro}</Alert>}
        {!util && <Alert type="info" title="Fim de semana">A unidade não atende neste dia. Escolha um dia útil.</Alert>}
        {util && passado && supervisor && <Alert type="info">Dias que já passaram ficam só para consulta.</Alert>}

        {util && (
          <div className="presenca-equipes">
            {equipes.map((equipe) => (
              <Section
                key={equipe.nome}
                title={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <TeamIcon equipe={equipe} size={28} /> Equipe {equipe.nome}
                  </span>
                }
                description={data === hoje ? `Hoje, ${exibirData(data)}` : exibirData(data)}
              >
                {!dados ? (
                  <div className="stack" style={{ gap: 12 }}>
                    <Skeleton height={44} />
                    <Skeleton height={44} />
                  </div>
                ) : (
                  <ul className="presenca-lista">
                    {CHAVES_PROFISSIONAIS.map((p) => (
                      <LinhaProfissional
                        key={p}
                        equipe={equipe.nome}
                        profissional={p}
                        registro={registroDe(equipe.nome, p)}
                        podeEditar={podeEditar}
                        ocupado={ocupado === `${equipe.nome}-${p}`}
                        onPresente={() => marcarPresente(equipe.nome, p)}
                        onAusente={() => setAusencia({ equipe: equipe.nome, profissional: p, data, registro: registroDe(equipe.nome, p) })}
                      />
                    ))}
                  </ul>
                )}
              </Section>
            ))}
          </div>
        )}

        <Section title="Próximas ausências" description="Lançadas para os 30 dias seguintes. Os pacientes já veem esses avisos no portal.">
          {!dados ? (
            <Skeleton height={44} />
          ) : proximas.length === 0 ? (
            <EmptyState icon={CalendarX2} title="Nenhuma ausência lançada">
              {supervisor ? "Para lançar férias ou licença, escolha o primeiro dia acima e marque Ausente." : "A unidade não avisou nenhuma ausência."}
            </EmptyState>
          ) : (
            <ul className="presenca-avisos">
              {proximas.map((g) => (
                <li key={`${g.equipe}-${g.profissional}-${g.de}`} className="presenca-aviso">
                  <CalendarX2 aria-hidden="true" />
                  <span style={{ flex: 1 }}>
                    <strong className="num">{periodoAusencia(g)}</strong> · Equipe {g.equipe} · {PROFISSIONAIS[g.profissional].rotulo}
                    {` · ${resumoAusencia({ ...g, situacao: "ausente" })}`}
                    {g.recado && <span className="presenca-aviso__recado"> “{g.recado}”</span>}
                  </span>
                  {supervisor && (
                    <Button size="sm" variant="ghost" className="btn--danger-text" icon={Trash2} onClick={() => setApagando(g)}>
                      Apagar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {ausencia && (
        <LancarAusencia
          alvo={ausencia}
          onFechar={() => setAusencia(null)}
          onSalvo={async () => {
            setAusencia(null);
            await carregar();
          }}
        />
      )}

      <ConfirmDialog
        open={!!apagando}
        danger
        title="Apagar esta ausência?"
        confirmLabel="Apagar"
        cancelLabel="Voltar"
        loading={enviando}
        onConfirm={apagar}
        onCancel={() => setApagando(null)}
      >
        {apagando && (
          <>
            {PROFISSIONAIS[apagando.profissional].rotulo} da equipe {apagando.equipe}, {periodoAusencia(apagando)}. Os dias voltam para “não informado” e o aviso sai do
            portal.
          </>
        )}
      </ConfirmDialog>
    </AppLayout>
  );
}

export default Presenca;
