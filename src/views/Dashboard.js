"use client";

import React, { useEffect, useState } from "react";
import { Link } from "../lib/router";
import { ChevronRight, Plus, Users, UserCog, RotateCw, ChartColumn, MapPin, Clock, Phone, CircleCheck, CalendarPlus, CalendarDays, Store, Pencil, UsersRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import api from "../services/api";
import AppLayout from "../components/AppLayout";
import AgendamentoTag from "../components/AgendamentoTag";
import { Alert, Button, ButtonLink, EmptyState, PageHeader, Section, Skeleton, TeamIcon } from "../components/ui";
import { StatusBar, StatusLegend } from "../components/StatusBar";
import { useResumoEquipes } from "../hooks/dados";
import { equipesDoUsuario, rotuloPapel, situacaoDe } from "../constants/dominio";
import { enderecoCompleto, exibirTelefone, hrefTelefone, plural, primeiroNome } from "../utils/formatos";
import { EM_ANDAMENTO, exibirData, hojeNoFuso, paraISO } from "../utils/agendamento";

const urlEquipe = (nome, filtro) =>
  `/equipe/${encodeURIComponent(nome)}${filtro ? `?situacao=${filtro}` : ""}`;

/** Pedidos do portal ainda em andamento (o agente só recebe os da sua microárea ou sem ACS). */
function usePedidosEmAndamento() {
  const [pedidos, setPedidos] = useState([]);
  useEffect(() => {
    let ativo = true;
    api
      .get("/agendamentos")
      .then((lista) => {
        if (ativo) setPedidos(lista.filter((p) => EM_ANDAMENTO.includes(p.situacao)));
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);
  return pedidos;
}

/** Aviso para o supervisor: quantos pedidos de cadastro esperam a visita ser marcada. */
function AvisoPedidos({ novos }) {
  if (novos === 0) return null;
  return (
    <Alert
      type="info"
      title={novos === 1 ? "1 pedido de cadastro aguardando" : `${novos} pedidos de cadastro aguardando`}
      action={
        <ButtonLink to="/agendamentos" size="sm" icon={CalendarPlus}>
          Ver pedidos
        </ButtonLink>
      }
      className="mb-section"
    >
      Pacientes pediram cadastro pela área do paciente e esperam o ACS marcar a visita.
    </Alert>
  );
}

/** Painel de uma equipe: total, pendentes e barra de andamento. */
function PainelEquipe({ item, destaque = false, editavel = false }) {
  const { equipe, contagem } = item;
  const visitados = contagem.total - contagem.pendente;

  if (destaque) {
    return (
      <section className="paper team-panel team-panel--featured" aria-labelledby={`equipe-${equipe.nome}`}>
        <div className="team-panel__head">
          <TeamIcon equipe={equipe} size={44} />
          <div>
            <h2 className="team-panel__name" id={`equipe-${equipe.nome}`}>
              Equipe {equipe.nome}
            </h2>
            <p className="team-panel__total">{plural(contagem.total, "paciente cadastrado", "pacientes cadastrados")}</p>
          </div>
        </div>

        <div className="team-panel__figure">
          <span className="team-panel__value">{contagem.pendente.toLocaleString("pt-BR")}</span>
          <span className="team-panel__value-label">
            {contagem.pendente === 1 ? "paciente pendente de visita" : "pacientes pendentes de visita"}
            {contagem.total > 0 && ` · ${plural(visitados, "visita registrada", "visitas registradas")}`}
          </span>
        </div>

        <StatusBar contagem={contagem} rotulo={`Andamento da equipe ${equipe.nome}`} />
        <StatusLegend contagem={contagem} linkPara={(s) => urlEquipe(equipe.nome, s.chave)} />

        <div className="team-panel__actions">
          <ButtonLink to={urlEquipe(equipe.nome, "pendente")} variant="primary" icon={Users}>
            Ver pendentes
          </ButtonLink>
          <ButtonLink to={urlEquipe(equipe.nome)} icon={Users}>
            Todos os pacientes
          </ButtonLink>
          <ButtonLink to={`/equipe/${encodeURIComponent(equipe.nome)}/adicionar`} icon={Plus}>
            Cadastrar paciente
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section className="paper team-panel team-panel--link" aria-labelledby={`equipe-${equipe.nome}`}>
      <div className="team-panel__head">
        <TeamIcon equipe={equipe} />
        <div>
          <h2 className="team-panel__name" id={`equipe-${equipe.nome}`}>
            <Link to={urlEquipe(equipe.nome)}>Equipe {equipe.nome}</Link>
          </h2>
          <p className="team-panel__total">{plural(contagem.total, "paciente", "pacientes")}</p>
        </div>
        <ChevronRight className="team-panel__chevron" aria-hidden="true" />
      </div>

      <div className="team-panel__figure">
        <span className="team-panel__value">{contagem.pendente.toLocaleString("pt-BR")}</span>
        <span className="team-panel__value-label">{contagem.pendente === 1 ? "pendente de visita" : "pendentes de visita"}</span>
      </div>

      <StatusBar contagem={contagem} rotulo={`Andamento da equipe ${equipe.nome}`} />
      <StatusLegend contagem={contagem} mostrarZeros={false} />

      {editavel && (
        <div className="team-panel__actions">
          <ButtonLink to={`/config/equipes?editar=${encodeURIComponent(equipe.nome)}`} size="sm" variant="ghost" icon={Pencil} aria-label={`Editar a equipe ${equipe.nome}`}>
            Editar equipe
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

/** Cartão no fim da grade do supervisor para criar mais uma equipe. */
function NovaEquipe() {
  return (
    <Link to="/config/equipes?nova=1" className="paper team-panel nova-equipe">
      <span className="nova-equipe__icone" aria-hidden="true">
        <Plus />
      </span>
      <span className="team-panel__name">Nova equipe</span>
      <span className="team-panel__total">Cadastre, renomeie ou exclua equipes</span>
    </Link>
  );
}

const LIMITE_PENDENTES = 5;

/** Aba da tela de pedidos onde o ACS age sobre este pedido. */
function abaDoPedido(p, hoje) {
  if (p.situacao === "ACaminho" || (p.situacao === "Confirmado" && paraISO(p.dataAgendada) <= hoje)) return "hoje";
  return p.situacao;
}

/** Pedido do portal na lista de pendências do ACS. */
function PedidoPendente({ pedido, hoje }) {
  const tel = hrefTelefone(pedido.telefone);
  const marcada = pedido.situacao === "Confirmado" || pedido.situacao === "ACaminho";
  return (
    <li className="list-item">
      <div className="list-item__main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Link to={`/agendamentos?situacao=${abaDoPedido(pedido, hoje)}`} className="list-item__title list-item__link">
            {pedido.nome}
          </Link>
          <span className="tag tag--solid-primary">Pedido do portal</span>
          <AgendamentoTag situacao={pedido.situacao} />
        </div>
        <div className="list-item__meta">
          <span className="list-item__meta-row">
            <CalendarDays aria-hidden="true" />
            <span>
              {marcada
                ? `Visita: ${exibirData(pedido.dataAgendada)}, ${pedido.periodoAgendado?.toLowerCase()}`
                : pedido.situacao === "Ausente"
                  ? "Ninguém em casa na última visita: remarque"
                  : `Prefere ${exibirData(pedido.dataPreferida)}, ${pedido.periodoPreferido?.toLowerCase()}`}
              {pedido.melhorHorario && ` · por volta das ${pedido.melhorHorario}`}
            </span>
          </span>
          <span className="list-item__meta-row">
            <MapPin aria-hidden="true" />
            <span>
              {enderecoCompleto(pedido) || "Endereço não informado"}
              {pedido.pontoReferencia && ` · ${pedido.pontoReferencia}`}
            </span>
          </span>
          <span className="list-item__meta-row">
            <Phone aria-hidden="true" />
            {tel ? <a href={tel}>{exibirTelefone(pedido.telefone)}</a> : <span>{exibirTelefone(pedido.telefone)}</span>}
          </span>
        </div>
      </div>
    </li>
  );
}

/** Lista curta do que o ACS ainda precisa visitar: pedidos do portal primeiro, depois os pacientes pendentes. */
function PendentesDeVisita({ item, pedidos = [] }) {
  const { equipe, pacientes } = item;
  const hoje = hojeNoFuso();
  const pendentes = pacientes.filter((p) => situacaoDe(p.status).chave === "pendente");
  const primeiros = pendentes.slice(0, LIMITE_PENDENTES);
  const descricao =
    pedidos.length > 0
      ? "Pedidos feitos pelo portal primeiro. Depois, os pacientes da equipe em ordem alfabética."
      : pendentes.length > 0
        ? "Em ordem alfabética. Toque no nome para abrir o cadastro."
        : undefined;

  return (
    <Section
      title="Pendentes de visita"
      description={descricao}
      bodyClassName="section__body--flush"
      footer={
        pendentes.length > LIMITE_PENDENTES ? (
          <ButtonLink to={urlEquipe(equipe.nome, "pendente")} variant="ghost" className="btn--primary-text">
            Ver os {pendentes.length} pendentes
            <ChevronRight aria-hidden="true" />
          </ButtonLink>
        ) : null
      }
    >
      {pendentes.length === 0 && pedidos.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Nenhuma visita pendente">
          Todos os pacientes da equipe {equipe.nome} já têm a visita registrada.
        </EmptyState>
      ) : (
        <ul className="list">
          {pedidos.map((p) => (
            <PedidoPendente key={p._id} pedido={p} hoje={hoje} />
          ))}
          {primeiros.map((p) => {
            const tel = hrefTelefone(p.telefone);
            return (
              <li key={p._id} className="list-item">
                <div className="list-item__main">
                  <Link to={`/equipe/${encodeURIComponent(equipe.nome)}/editar/${p._id}`} className="list-item__title list-item__link">
                    {p.nome}
                  </Link>
                  <div className="list-item__meta">
                    <span className="list-item__meta-row">
                      <MapPin aria-hidden="true" />
                      <span>
                        {enderecoCompleto(p) || "Endereço não informado"}
                        {p.pontoReferencia && ` · ${p.pontoReferencia}`}
                      </span>
                    </span>
                    {p.melhorHorario && (
                      <span className="list-item__meta-row">
                        <Clock aria-hidden="true" />
                        <span>{p.melhorHorario}</span>
                      </span>
                    )}
                    <span className="list-item__meta-row">
                      <Phone aria-hidden="true" />
                      {tel ? <a href={tel}>{exibirTelefone(p.telefone)}</a> : <span>{exibirTelefone(p.telefone)}</span>}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function PainelCarregando({ destaque }) {
  return (
    <div className={`paper team-panel${destaque ? " team-panel--featured" : ""}`} aria-hidden="true">
      <div className="team-panel__head">
        <Skeleton width={40} height={40} />
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          <Skeleton width="45%" height={16} />
          <Skeleton width="30%" height={12} />
        </div>
      </div>
      <Skeleton width="60%" height={28} />
      <Skeleton height={8} style={{ borderRadius: 999 }} />
      <Skeleton width="80%" height={12} />
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const supervisor = user?.role === "supervisor";
  const equipes = equipesDoUsuario(user);
  const { carregando, erro, porEquipe, geral, recarregar } = useResumoEquipes(user);
  const pedidos = usePedidosEmAndamento();

  const descricao = supervisor
    ? carregando
      ? "Supervisor · todas as equipes"
      : `Supervisor · ${plural(geral.total, "paciente", "pacientes")} em ${equipes.length} equipes, ${geral.pendente.toLocaleString("pt-BR")} pendentes de visita`
    : rotuloPapel(user);

  return (
    <AppLayout>
      <PageHeader
        title={`Olá, ${primeiroNome(user?.nome)}`}
        description={descricao}
        actions={
          supervisor ? (
            <>
              <ButtonLink to="/relatorios" icon={ChartColumn}>
                Relatórios
              </ButtonLink>
              <ButtonLink to="/config/usuarios" icon={UserCog}>
                Gerenciar usuários
              </ButtonLink>
              <ButtonLink to="/config/equipes" icon={UsersRound}>
                Gerenciar equipes
              </ButtonLink>
            </>
          ) : null
        }
      />

      {supervisor && <AvisoPedidos novos={pedidos.filter((p) => p.situacao === "Aguardando").length} />}

      <div className="mb-section">
        <ButtonLink to="/setor" icon={Store} size="sm">
          Funcionamento da unidade hoje
        </ButtonLink>
      </div>

      {erro && (
        <Alert
          type="danger"
          title="Não foi possível carregar os pacientes"
          action={
            <Button size="sm" icon={RotateCw} onClick={recarregar}>
              Tentar de novo
            </Button>
          }
          className="mb-section"
        >
          {erro}
        </Alert>
      )}

      {equipes.length === 0 ? (
        <div className="paper">
          <EmptyState icon={Users} title="Sua conta não está vinculada a uma equipe">
            Peça ao supervisor para vincular sua conta a uma equipe em Configurações › Gerenciar usuários.
          </EmptyState>
        </div>
      ) : carregando ? (
        supervisor ? (
          <div className="teams-grid">
            {equipes.map((e) => (
              <PainelCarregando key={e.nome} />
            ))}
          </div>
        ) : (
          <PainelCarregando destaque />
        )
      ) : erro ? null : supervisor ? (
        <div className="teams-grid">
          {porEquipe.map((item) => (
            <PainelEquipe key={item.equipe.nome} item={item} editavel />
          ))}
          <NovaEquipe />
        </div>
      ) : (
        <div className="home-grid">
          {porEquipe.map((item) => (
            <React.Fragment key={item.equipe.nome}>
              <PainelEquipe item={item} destaque />
              {(item.contagem.total > 0 || pedidos.length > 0) && <PendentesDeVisita item={item} pedidos={pedidos} />}
            </React.Fragment>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export default Dashboard;
