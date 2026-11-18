"use client";

import React from "react";
import { CalendarX2, CircleCheck, CircleHelp, Stethoscope, Syringe, UserX } from "lucide-react";
import { Alert, Section } from "./ui";
import { exibirData, hojeNoFuso } from "../utils/agendamento";
import { PROFISSIONAIS, agruparAusencias, resumoAusencia } from "../utils/presenca";
import { UNIDADE } from "../constants/unidade";

export const ICONES_PROFISSIONAL = { medico: Stethoscope, enfermeiro: Syringe };

const TAGS = {
  presente: { rotulo: "Presente", status: "realizada", Icone: CircleCheck },
  ausente: { rotulo: "Ausente", status: "ausente", Icone: UserX },
  nao_informado: { rotulo: "Não informado", status: "pendente", Icone: CircleHelp },
};

/** Presente / Ausente / Não informado: sempre cor + ícone + texto. */
export function PresencaTag({ situacao }) {
  const t = TAGS[situacao] || TAGS.nao_informado;
  return (
    <span className="tag" data-status={t.status}>
      <t.Icone aria-hidden="true" />
      {t.rotulo}
    </span>
  );
}

const diaCurto = (iso) => exibirData(iso, { weekday: "short", day: "2-digit", month: "2-digit" });

/** "seg., 23/11" ou "seg., 23/11 a sex., 27/11". */
export function periodoAusencia(g) {
  return g.de === g.ate ? diaCurto(g.de) : `${diaCurto(g.de)} a ${diaCurto(g.ate)}`;
}

function juntar(nomes) {
  return nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/**
 * Painel do portal: se o médico e o enfermeiro da equipe do paciente estão atendendo.
 * Se alguém está ausente, pede para procurar a unidade ou o ACS e remarcar a consulta.
 */
export function PainelAtendimento({ atendimento }) {
  if (!atendimento) return null;
  const { equipe, dia, profissionais = [], proximasAusencias = [], acs } = atendimento;
  const hoje = dia === hojeNoFuso();
  const quando = hoje ? "hoje" : exibirData(dia);
  const ausentes = profissionais.filter((p) => p.situacao === "ausente");
  const recados = ausentes.filter((p) => p.recado);
  const proximas = agruparAusencias(proximasAusencias);
  const procurar = (
    <>
      Se você tinha consulta marcada, <strong>procure a {UNIDADE.nome} ({UNIDADE.endereco}) para remarcar</strong> ou fale com o ACS da sua equipe
      {acs ? `, ${acs}` : ""}.
    </>
  );

  return (
    <Section
      title={`Atendimento da equipe ${equipe}`}
      description={`Quem está atendendo ${hoje ? `hoje, ${exibirData(dia)}` : `no próximo dia útil, ${exibirData(dia)}`}.`}
    >
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <ul className="presenca-lista">
          {profissionais.map((p) => {
            const Icone = ICONES_PROFISSIONAL[p.profissional] || Stethoscope;
            const detalhe =
              p.situacao === "ausente"
                ? resumoAusencia(p) || "Não vai atender"
                : p.situacao === "presente"
                  ? "Atendendo normalmente"
                  : "A unidade ainda não informou";
            return (
              <li key={p.profissional} className="presenca-item" data-situacao={p.situacao}>
                <span className="presenca-item__icone" aria-hidden="true">
                  <Icone />
                </span>
                <span className="presenca-item__texto">
                  <span className="presenca-item__nome">{PROFISSIONAIS[p.profissional]?.rotulo}</span>
                  <span className="presenca-item__detalhe">{detalhe}</span>
                </span>
                <PresencaTag situacao={p.situacao} />
              </li>
            );
          })}
        </ul>

        {ausentes.length > 0 && (
          <Alert
            type="warning"
            title={`${juntar(ausentes.map((p) => PROFISSIONAIS[p.profissional]?.rotulo))} ${ausentes.length > 1 ? "ausentes" : "ausente"} ${quando}${
              ausentes.every((p) => p.turno === "Manhã") ? " pela manhã" : ausentes.every((p) => p.turno === "Tarde") ? " à tarde" : ""
            }`}
          >
            <p style={{ margin: 0 }}>{procurar}</p>
            {recados.map((p) => (
              <p key={p.profissional} style={{ margin: "var(--space-2) 0 0" }}>
                Recado da unidade: “{p.recado}”
              </p>
            ))}
          </Alert>
        )}

        {proximas.length > 0 && (
          <div>
            <h3 className="field__label" style={{ marginBottom: "var(--space-2)" }}>
              Próximas ausências já avisadas
            </h3>
            <ul className="presenca-avisos">
              {proximas.map((g) => (
                <li key={`${g.profissional}-${g.de}`} className="presenca-aviso">
                  <CalendarX2 aria-hidden="true" />
                  <span>
                    <strong className="num">{periodoAusencia(g)}</strong> · {PROFISSIONAIS[g.profissional]?.rotulo} ausente
                    {resumoAusencia({ ...g, situacao: "ausente" }) && ` · ${resumoAusencia({ ...g, situacao: "ausente" })}`}
                    {g.recado && <span className="presenca-aviso__recado"> “{g.recado}”</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="field__hint" style={{ marginTop: "var(--space-2)" }}>
              Tem consulta num desses dias? {procurar}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
