"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "../lib/router";
import { Check, Circle } from "lucide-react";
import api from "../services/api";
import AuthLayout from "../components/AuthLayout";
import { Alert, Button, ButtonLink, Field, PasswordInput, Skeleton } from "../components/ui";

const REQUISITOS = [
  { id: "tamanho", texto: "Pelo menos 6 caracteres", testa: (s) => s.length >= 6 },
  { id: "maiuscula", texto: "Uma letra maiúscula", testa: (s) => /[A-Z]/.test(s) },
  { id: "minuscula", texto: "Uma letra minúscula", testa: (s) => /[a-z]/.test(s) },
  { id: "especial", texto: "Um caractere especial (ex.: ! @ # $)", testa: (s) => /[^a-zA-Z0-9]/.test(s) },
];

function Cadastro() {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", confirmaSenha: "" });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [precisaBootstrap, setPrecisaBootstrap] = useState(false);
  const navigate = useNavigate();

  // Essa tela pública só funciona para criar o PRIMEIRO usuário (o supervisor).
  // Depois disso, novos usuários são cadastrados pelo supervisor dentro do sistema.
  useEffect(() => {
    api
      .get("/auth/status", { auth: false })
      .then((data) => setPrecisaBootstrap(data.precisaBootstrap))
      .catch(() => setPrecisaBootstrap(false))
      .finally(() => setVerificando(false));
  }, []);

  const alterar = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (erros[name]) setErros((atual) => ({ ...atual, [name]: undefined }));
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro("");

    const novos = {};
    if (!form.nome.trim()) novos.nome = "Informe o nome completo.";
    if (!form.email.trim()) novos.email = "Informe o e-mail.";
    if (!REQUISITOS.every((r) => r.testa(form.senha))) novos.senha = "A senha ainda não atende a todos os requisitos.";
    if (!form.confirmaSenha) novos.confirmaSenha = "Repita a senha.";
    else if (form.senha !== form.confirmaSenha) novos.confirmaSenha = "As senhas não coincidem.";
    setErros(novos);

    const primeiro = ["nome", "email", "senha", "confirmaSenha"].find((k) => novos[k]);
    if (primeiro) {
      document.getElementById(`cadastro-${primeiro}`)?.focus();
      return;
    }

    setCarregando(true);
    try {
      await api.post("/auth/register", { nome: form.nome.trim(), email: form.email.trim(), senha: form.senha }, { auth: false });
      navigate("/", { state: { contaCriada: true } });
    } catch (err) {
      setErro(err.message || "Não foi possível criar a conta.");
    } finally {
      setCarregando(false);
    }
  };

  if (verificando) {
    return (
      <AuthLayout title="Cadastro" subtitle="Verificando a configuração do sistema…">
        <div className="auth__form" aria-hidden="true">
          <Skeleton height={44} />
          <Skeleton height={44} />
          <Skeleton height={48} />
        </div>
      </AuthLayout>
    );
  }

  if (!precisaBootstrap) {
    return (
      <AuthLayout title="Cadastro">
        <div className="auth__form">
          <Alert type="info" title="O sistema já está configurado">
            Novas contas são criadas pelo supervisor, dentro do sistema, em <strong>Configurações › Gerenciar usuários</strong>.
          </Alert>
          <ButtonLink to="/" variant="primary" block className="btn--lg">
            Voltar para o login
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Configuração inicial"
      subtitle="Crie a conta do supervisor. Depois, ele cadastra os agentes de cada equipe."
      footer={
        <span>
          Já tem conta? <Link to="/">Entrar</Link>
        </span>
      }
    >
      <form className="auth__form" onSubmit={handleCadastro} noValidate>
        {erro && <Alert type="danger">{erro}</Alert>}

        <Field label="Nome completo" htmlFor="cadastro-nome" required error={erros.nome}>
          {(props) => <input {...props} name="nome" className="input" value={form.nome} onChange={alterar} autoComplete="name" />}
        </Field>

        <Field label="E-mail" htmlFor="cadastro-email" required error={erros.email}>
          {(props) => (
            <input
              {...props}
              name="email"
              type="email"
              className="input"
              value={form.email}
              onChange={alterar}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
        </Field>

        <Field label="Senha" htmlFor="cadastro-senha" required error={erros.senha}>
          {(props) => (
            <>
              <PasswordInput {...props} name="senha" value={form.senha} onChange={alterar} autoComplete="new-password" />
              <ul className="requirements" aria-label="Requisitos da senha">
                {REQUISITOS.map((r) => {
                  const ok = r.testa(form.senha);
                  return (
                    <li key={r.id} data-ok={ok}>
                      {ok ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
                      {r.texto}
                      <span className="sr-only">{ok ? " (atendido)" : " (pendente)"}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Field>

        <Field label="Confirmar senha" htmlFor="cadastro-confirmaSenha" required error={erros.confirmaSenha}>
          {(props) => (
            <PasswordInput {...props} name="confirmaSenha" value={form.confirmaSenha} onChange={alterar} autoComplete="new-password" />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" block loading={carregando} loadingText="Criando conta…">
          Criar conta de supervisor
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Cadastro;
