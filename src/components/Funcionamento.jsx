"use client";

import React, { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { Clock, FlaskConical, Pill, Smile, Syringe, Users, BadgeCheck, TriangleAlert, PackageX } from "lucide-react";
import { MOVIMENTOS, SETORES, URGENCIAS, estadoDoSetor, relogio, textoHorario } from "../utils/setores";

export const ICONES_SETOR = { farmacia: Pill, laboratorio: FlaskConical, odontologia: Smile, vacinacao: Syringe, ipe: BadgeCheck };

/** Relógio que avança sozinho, para o "aberto/fechado" mudar na hora certa sem recarregar. */
export function useAgora(intervalo = 30000) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return agora;
}

/** Funcionamento público (portal), atualizado a cada 2 minutos. */
export function useFuncionamentoPublico() {
  const [setores, setSetores] = useState(null);
  const [erro, setErro] = useState("");
  const [carregadoEm, setCarregadoEm] = useState(null);
  const recarregar = useCallback(() => {
    api
      .get("/portal/unidade", { auth: false })
      .then((r) => {
        setSetores(r.setores);
        setCarregadoEm(new Date());
        setErro("");
      })
      .catch((err) => setErro(err.message || "Não foi possível carregar o funcionamento da unidade."));
  }, []);
  useEffect(() => {
    recarregar();
    const id = setInterval(recarregar, 120000);
    return () => clearInterval(id);
  }, [recarregar]);
  return { setores, erro, carregadoEm, recarregar };
}

const minutosDesde = (data, agora) => Math.max(0, Math.round((agora - new Date(data)) / 60000));
export function haQuanto(data, agora) {
  if (!data) return "";
  const min = minutosDesde(data, agora);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  return `às ${relogio(new Date(data)).hora}`;
}

/** Cartão de um setor como o paciente vê. `compacto` mostra só a linha principal. */
export function CartaoSetor({ setor, agora, compacto = false }) {
  const def = SETORES[setor.chave];
  const Icone = ICONES_SETOR[setor.chave];
  const e = estadoDoSetor(setor, agora);
  const horario = textoHorario(setor);
  const faltas = def.faltas && setor.faltas?.length > 0 ? setor.faltas : [];

  return (
    <li className="setor-cartao" data-tom={e.tom}>
      <span className="setor-cartao__icone" aria-hidden="true">
        <Icone />
      </span>
      <div className="setor-cartao__corpo">
        <div className="setor-cartao__topo">
          <span className="setor-cartao__nome">{def.rotulo}</span>
          <span className="setor-estado" data-tom={e.tom}>
            <span className="setor-estado__ponto" aria-hidden="true" />
            {e.titulo}
          </span>
        </div>
        {(e.detalhe || e.urgencia) && (
          <span className="setor-cartao__linha">{[e.detalhe, e.urgencia && URGENCIAS[e.urgencia]].filter(Boolean).join(" · ")}</span>
        )}
        {e.movimento && (
          <span className="setor-movimento" data-nivel={e.movimento}>
            <Users aria-hidden="true" />
            {MOVIMENTOS[e.movimento]} <span className="setor-cartao__quando">(informado {haQuanto(e.movimentoEm, agora)})</span>
          </span>
        )}
        {e.recado && <span className="setor-cartao__recado">“{e.recado}”</span>}
        {faltas.length > 0 && (
          <span className="setor-faltas">
            <PackageX aria-hidden="true" />
            <span>
              <strong>{def.faltas}:</strong> {faltas.map((f) => f.nome).join(", ")}
            </span>
          </span>
        )}
        {!compacto && (
          <>
            {setor.acesso && <span className="setor-cartao__acesso">{setor.acesso}</span>}
            {horario && (
              <span className="setor-cartao__horario">
                <Clock aria-hidden="true" />
                {horario}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/** Lista de todos os setores. */
export function PainelFuncionamento({ setores, agora, compacto = false, rotulo = "Funcionamento dos setores hoje" }) {
  return (
    <ul className="setor-lista" aria-label={rotulo}>
      {setores.map((s) => (
        <CartaoSetor key={s.chave} setor={s} agora={agora} compacto={compacto} />
      ))}
    </ul>
  );
}

/** Aviso fixo: a informação vem da própria unidade e pode mudar. */
export function AvisoFuncionamento() {
  return (
    <p className="field__hint setor-aviso">
      <TriangleAlert aria-hidden="true" />
      Informado pelos próprios setores e atualizado ao longo do dia. Em caso de dúvida, procure a recepção.
    </p>
  );
}
