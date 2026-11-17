"use client";

import React, { useRef, useState } from "react";
import { Check, CircleAlert, CircleCheck, MapPin } from "lucide-react";
import api from "../../services/api";
import PortalLayout from "../../components/PortalLayout";
import { Alert, Button, ButtonLink, Field, PageHeader, Section, Stepper } from "../../components/ui";
import { GRUPOS_ATENCAO } from "../../constants/dominio";
import { mascaraCEP, mascaraCNS, mascaraCPF, mascaraTelefone, somenteDigitos } from "../../utils/formatos";
import { PERIODOS, exibirData, hojeNoFuso, limitesData, validarPedido } from "../../utils/agendamento";

const formInicial = {
  nome: "",
  cpf: "",
  dataNascimento: "",
  cns: "",
  telefone: "",
  cep: "",
  endereco: "",
  numero: "",
  pontoReferencia: "",
  trabalhador: "",
  enderecoMoradia: "",
  melhorHorario: "",
  moradoresHomens: 0,
  moradoresMulheres: 0,
  moradoresCriancas: 0,
  gruposAtencao: [],
  numeroSES: "",
  observacao: "",
  dataPreferida: "",
  periodoPreferido: "",
  consentimento: false,
  site: "", // armadilha para robôs (campo escondido)
};

const ORDEM = [
  "nome",
  "cpf",
  "dataNascimento",
  "cns",
  "telefone",
  "dataPreferida",
  "periodoPreferido",
  "endereco",
  "numero",
  "trabalhador",
  "melhorHorario",
  "consentimento",
];

const MASCARAS = { cpf: mascaraCPF, telefone: mascaraTelefone, cns: mascaraCNS };

/** Grupo de opções (radio) com rótulo e erro, no padrão do formulário de paciente. */
function Escolha({ nome, rotulo, opcoes, valor, onChange, erro }) {
  const idErro = `erro-${nome}`;
  return (
    <fieldset className="fieldset field" aria-describedby={erro ? idErro : undefined}>
      <legend className="field__label">
        {rotulo}
        <span className="field__required" aria-hidden="true">
          *
        </span>
      </legend>
      <div className="choices" aria-invalid={erro ? true : undefined}>
        {opcoes.map((opcao, i) => (
          <label key={opcao} className="choice choice--radio">
            <input
              type="radio"
              name={nome}
              value={opcao}
              checked={valor === opcao}
              onChange={onChange}
              id={i === 0 ? `campo-${nome}` : undefined}
            />
            <span className="choice__check" aria-hidden="true" />
            {opcao}
          </label>
        ))}
      </div>
      {erro && (
        <p className="field__error" id={idErro}>
          <CircleAlert aria-hidden="true" />
          {erro}
        </p>
      )}
    </fieldset>
  );
}

/** Etapa 1: o CEP decide se o endereço é do território da UBS. */
function EtapaCep({ onAtendido }) {
  const [cep, setCep] = useState("");
  const [erro, setErro] = useState("");
  const [fora, setFora] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const verificar = async (e) => {
    e.preventDefault();
    setFora(false);
    if (somenteDigitos(cep).length !== 8) {
      setErro("Digite os 8 números do CEP.");
      document.getElementById("campo-cep-inicial")?.focus();
      return;
    }
    setErro("");
    setVerificando(true);
    try {
      const r = await api.get(`/portal/cep/${somenteDigitos(cep)}`, { auth: false });
      if (r.atendido) onAtendido(cep, r);
      else setFora(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setVerificando(false);
    }
  };

  return (
    <form onSubmit={verificar} noValidate>
      <div className="stack">
        <Section title="Onde você mora?" description="Primeiro, confira se o seu endereço é atendido por esta unidade.">
          <div className="form-grid">
            <Field
              className="span-3"
              label="CEP da sua casa"
              required
              htmlFor="campo-cep-inicial"
              error={erro}
              hint="Cada quadra e bloco tem seu próprio CEP. Ele aparece em contas de luz e água."
            >
              {(props) => (
                <input
                  {...props}
                  className="input num"
                  value={cep}
                  onChange={(e) => {
                    setCep(mascaraCEP(e.target.value));
                    setFora(false);
                    setErro("");
                  }}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                />
              )}
            </Field>
          </div>
        </Section>

        {fora && (
          <Alert type="warning" title="Este CEP não é atendido por esta UBS">
            O cadastro pelo site é só para moradores do território desta unidade. Procure a unidade básica de saúde de
            referência do seu endereço. Se você tem certeza de que mora na área, confira o CEP ou vá até a UBS.
          </Alert>
        )}
      </div>

      <div className="action-bar">
        <ButtonLink to="/paciente">Voltar</ButtonLink>
        <Button type="submit" variant="primary" loading={verificando} loadingText="Verificando…">
          Continuar
        </Button>
      </div>
    </form>
  );
}

function PedidoEnviado({ resultado, dataPreferida, periodo }) {
  return (
    <div className="stack">
      <div className="paper protocolo">
        <span className="protocolo__icone" aria-hidden="true">
          <CircleCheck />
        </span>
        <h2 className="protocolo__titulo">Pedido enviado</h2>
        <p className="protocolo__texto">Anote o número do seu protocolo:</p>
        <p className="protocolo__numero num" aria-label={`Protocolo ${resultado.protocolo.split("").join(" ")}`}>
          {resultado.protocolo}
        </p>
        <p className="protocolo__texto">
          Seu pedido foi para a <strong>equipe {resultado.equipe}</strong>. O agente comunitário de saúde da sua área vai
          confirmar a visita por telefone ou WhatsApp. Você pediu {exibirData(`${dataPreferida}T00:00:00Z`)}, {periodo.toLowerCase()}.
        </p>
      </div>
      <div className="action-bar" style={{ position: "static" }}>
        <ButtonLink to="/paciente">Início</ButtonLink>
        <ButtonLink to="/paciente/consultar" variant="primary">
          Acompanhar meu pedido
        </ButtonLink>
      </div>
    </div>
  );
}

function PortalPedir() {
  const topo = useRef(null);
  const [territorio, setTerritorio] = useState(null);
  const [form, setForm] = useState(formInicial);
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const limites = limitesData();

  const rolarTopo = () => topo.current?.scrollIntoView({ block: "start", behavior: "smooth" });

  const cepAtendido = (cep, dados) => {
    setTerritorio(dados);
    setForm((f) => ({ ...f, cep, endereco: f.endereco || dados.endereco || "" }));
    rolarTopo();
  };

  const trocarCep = () => {
    setTerritorio(null);
    setForm((f) => ({ ...f, cep: "", endereco: "" }));
    setErros({});
    setErro("");
  };

  const alterar = (e) => {
    const { name, value, type, checked } = e.target;
    const valor = type === "checkbox" ? checked : MASCARAS[name] ? MASCARAS[name](value) : value;
    setForm((f) => ({ ...f, [name]: valor }));
    if (erros[name]) setErros((atual) => ({ ...atual, [name]: undefined }));
  };

  const alternarGrupo = (grupo) =>
    setForm((f) => ({
      ...f,
      gruposAtencao: f.gruposAtencao.includes(grupo) ? f.gruposAtencao.filter((g) => g !== grupo) : [...f.gruposAtencao, grupo],
    }));

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    const novos = validarPedido(form);
    setErros(novos);
    const primeiro = ORDEM.find((k) => novos[k]);
    if (primeiro) {
      const alvo = document.getElementById(`campo-${primeiro}`);
      alvo?.focus();
      alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setEnviando(true);
    try {
      const r = await api.post("/portal/pedidos", form, { auth: false });
      setResultado(r);
      rolarTopo();
    } catch (err) {
      setErro(err.message || "Não foi possível enviar o pedido.");
      rolarTopo();
    } finally {
      setEnviando(false);
    }
  };

  const qtdErros = Object.values(erros).filter(Boolean).length;

  return (
    <PortalLayout>
      <div ref={topo} style={{ scrollMarginTop: 72 }}>
        <PageHeader
          breadcrumb={[{ label: "Início", to: "/paciente" }, { label: "Pedir cadastro" }]}
          title="Pedir meu cadastro"
          description={
            resultado
              ? undefined
              : territorio
                ? "Preencha seus dados. Campos com * são obrigatórios."
                : "Leva poucos minutos e não precisa criar senha."
          }
        />
      </div>

      {resultado ? (
        <PedidoEnviado resultado={resultado} dataPreferida={form.dataPreferida} periodo={form.periodoPreferido} />
      ) : !territorio ? (
        <EtapaCep onAtendido={cepAtendido} />
      ) : (
        <form onSubmit={enviar} noValidate>
          <div className="stack">
            <Alert type="success" title="Seu endereço é atendido por esta UBS" action={<Button size="sm" onClick={trocarCep}>Trocar CEP</Button>}>
              <span className="list-item__meta-row" style={{ display: "inline-flex", gap: 6 }}>
                <MapPin aria-hidden="true" style={{ width: 16, height: 16 }} />
                CEP {form.cep}
                {territorio.endereco && ` · ${territorio.endereco}`} · Equipe {territorio.equipe}
              </span>
            </Alert>

            {erro && <Alert type="danger" title="Não foi possível enviar">{erro}</Alert>}
            {qtdErros > 0 && (
              <Alert type="danger">
                {qtdErros === 1 ? "Um campo precisa de atenção." : `${qtdErros} campos precisam de atenção.`} Confira as mensagens abaixo.
              </Alert>
            )}

            <Section title="Seus dados">
              <div className="form-grid">
                <Field label="Nome completo" required htmlFor="campo-nome" error={erros.nome}>
                  {(props) => <input {...props} name="nome" className="input" value={form.nome} onChange={alterar} autoComplete="name" autoCapitalize="words" />}
                </Field>
                <Field className="span-3" label="CPF" required htmlFor="campo-cpf" error={erros.cpf}>
                  {(props) => (
                    <input {...props} name="cpf" className="input num" value={form.cpf} onChange={alterar} inputMode="numeric" placeholder="000.000.000-00" autoComplete="off" />
                  )}
                </Field>
                <Field className="span-3" label="Data de nascimento" required htmlFor="campo-dataNascimento" error={erros.dataNascimento}>
                  {(props) => (
                    <input {...props} type="date" name="dataNascimento" className="input" max={hojeNoFuso()} value={form.dataNascimento} onChange={alterar} autoComplete="bday" />
                  )}
                </Field>
                <Field className="span-3" label="Cartão SUS (CNS)" optional htmlFor="campo-cns" error={erros.cns} hint="15 números, no verso do cartão ou no app Meu SUS Digital.">
                  {(props) => (
                    <input {...props} name="cns" className="input num" value={form.cns} onChange={alterar} inputMode="numeric" placeholder="000 0000 0000 0000" autoComplete="off" />
                  )}
                </Field>
                <Field className="span-3" label="Telefone (WhatsApp)" required htmlFor="campo-telefone" error={erros.telefone} hint="O agente usa este número para confirmar a visita.">
                  {(props) => (
                    <input {...props} name="telefone" type="tel" className="input num" value={form.telefone} onChange={alterar} inputMode="tel" placeholder="(61) 90000-0000" autoComplete="tel-national" />
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Dia da visita">
              <div className="form-grid">
                <Field className="span-3" label="Dia que você prefere" required htmlFor="campo-dataPreferida" error={erros.dataPreferida} hint="De segunda a sexta, a partir de amanhã.">
                  {(props) => (
                    <input {...props} type="date" name="dataPreferida" className="input" min={limites.min} max={limites.max} value={form.dataPreferida} onChange={alterar} />
                  )}
                </Field>
                <div className="span-3">
                  <Escolha nome="periodoPreferido" rotulo="Período" opcoes={PERIODOS} valor={form.periodoPreferido} onChange={alterar} erro={erros.periodoPreferido} />
                </div>
              </div>
            </Section>

            <Section title="Endereço">
              <div className="form-grid">
                <Field className="span-4" label="Endereço" required htmlFor="campo-endereco" error={erros.endereco} hint="Quadra e bloco, ex.: SQN 404 Bloco A">
                  {(props) => <input {...props} name="endereco" className="input" value={form.endereco} onChange={alterar} autoComplete="address-line1" />}
                </Field>
                <Field className="span-2" label="Nº / apartamento" required htmlFor="campo-numero" error={erros.numero}>
                  {(props) => <input {...props} name="numero" className="input" value={form.numero} onChange={alterar} autoComplete="address-line2" placeholder="Ex.: 302" />}
                </Field>
                <Field label="Ponto de referência" optional htmlFor="campo-pontoReferencia">
                  {(props) => <input {...props} name="pontoReferencia" className="input" value={form.pontoReferencia} onChange={alterar} autoComplete="off" />}
                </Field>
              </div>
            </Section>

            <Section title="Trabalho e horário">
              <div className="form-grid">
                <Escolha nome="trabalhador" rotulo="Você trabalha fora de casa?" opcoes={["Sim", "Não"]} valor={form.trabalhador} onChange={alterar} erro={erros.trabalhador} />
                {form.trabalhador === "Sim" && (
                  <Field label="Endereço de moradia" optional htmlFor="campo-enderecoMoradia" hint="Se você mora em outro endereço, diferente do informado acima.">
                    {(props) => <input {...props} name="enderecoMoradia" className="input" value={form.enderecoMoradia} onChange={alterar} />}
                  </Field>
                )}
                <Field label="Melhor horário para receber o agente" required htmlFor="campo-melhorHorario" error={erros.melhorHorario}>
                  {(props) => (
                    <input {...props} name="melhorHorario" className="input" value={form.melhorHorario} onChange={alterar} placeholder="Ex.: depois das 14h" autoComplete="off" />
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Quem mora na casa" description="Contando com você.">
              <div className="form-grid">
                {[
                  { nome: "moradoresHomens", rotulo: "Homens" },
                  { nome: "moradoresMulheres", rotulo: "Mulheres" },
                  { nome: "moradoresCriancas", rotulo: "Crianças" },
                ].map((campo) => (
                  <Field key={campo.nome} className="span-2 field--inline" label={campo.rotulo} htmlFor={`campo-${campo.nome}`}>
                    {(props) => <Stepper id={props.id} name={campo.nome} value={form[campo.nome]} onChange={alterar} label={campo.rotulo.toLowerCase()} />}
                  </Field>
                ))}
              </div>
            </Section>

            <Section title="Saúde" description="Opcional. Ajuda a equipe a se preparar para a visita.">
              <div className="form-grid">
                <fieldset className="fieldset field">
                  <legend className="field__label">
                    Alguém da casa é… <span className="field__optional">(marque todos que se aplicam)</span>
                  </legend>
                  <div className="choices">
                    {GRUPOS_ATENCAO.map((grupo) => (
                      <label key={grupo} className="choice">
                        <input type="checkbox" checked={form.gruposAtencao.includes(grupo)} onChange={() => alternarGrupo(grupo)} />
                        <span className="choice__check" aria-hidden="true">
                          <Check strokeWidth={3} />
                        </span>
                        {grupo}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field className="span-3" label="Número do SES" optional htmlFor="campo-numeroSES">
                  {(props) => <input {...props} name="numeroSES" className="input" value={form.numeroSES} onChange={alterar} autoComplete="off" />}
                </Field>
                <Field label="Algo que o agente precisa saber?" optional htmlFor="campo-observacao">
                  {(props) => <textarea {...props} name="observacao" className="textarea" rows={3} value={form.observacao} onChange={alterar} />}
                </Field>
              </div>
            </Section>

            <Section title="Uso dos seus dados">
              <p className="lgpd__texto">
                Seus dados são usados somente pela equipe de Saúde da Família desta UBS para fazer o seu cadastro e marcar a
                visita, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Eles não são compartilhados com
                terceiros. Se não quiser mais a visita, você pode cancelar o pedido a qualquer momento em "Acompanhar meu pedido".
              </p>
              <label className="choice" style={{ alignItems: "flex-start" }}>
                <input type="checkbox" id="campo-consentimento" name="consentimento" checked={form.consentimento} onChange={alterar} aria-invalid={erros.consentimento ? true : undefined} aria-describedby={erros.consentimento ? "erro-consentimento" : undefined} />
                <span className="choice__check" aria-hidden="true">
                  <Check strokeWidth={3} />
                </span>
                Li e concordo com o uso dos meus dados para o cadastro na UBS.
              </label>
              {erros.consentimento && (
                <p className="field__error" id="erro-consentimento">
                  <CircleAlert aria-hidden="true" />
                  {erros.consentimento}
                </p>
              )}
              <div className="armadilha" aria-hidden="true">
                <label>
                  Site
                  <input name="site" tabIndex={-1} autoComplete="off" value={form.site} onChange={alterar} />
                </label>
              </div>
            </Section>
          </div>

          <div className="action-bar">
            <ButtonLink to="/paciente">Voltar</ButtonLink>
            <Button type="submit" variant="primary" loading={enviando} loadingText="Enviando…">
              Enviar pedido
            </Button>
          </div>
        </form>
      )}
    </PortalLayout>
  );
}

export default PortalPedir;
