"use client";

import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "../lib/router";
import { Mail } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../components/AuthLayout";
import { Alert, Button, Field, PasswordInput } from "../components/ui";

function Login() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState({});
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const contaCriada = location.state?.contaCriada;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    const novosErros = {};
    if (!email.trim()) novosErros.email = "Informe seu e-mail.";
    if (!senha) novosErros.senha = "Informe sua senha.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      document.getElementById(novosErros.email ? "login-email" : "login-senha")?.focus();
      return;
    }

    setCarregando(true);
    try {
      const data = await api.post("/auth/login", { email: email.trim(), senha }, { auth: false });
      login(data.token, data.user);
      navigate(data.user?.role === "setor" ? "/setor" : "/dashboard");
    } catch (err) {
      setErro(err.message || "E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthLayout
      title="Acesso ao sistema"
      subtitle="Entre com o e-mail e a senha cadastrados pelo supervisor."
      footer={
        <div className="stack" style={{ gap: 8 }}>
          <span>
            Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
          </span>
          <span>
            É paciente? <Link to="/paciente">Agende seu cadastro</Link>
          </span>
        </div>
      }
    >
      <form className="auth__form" onSubmit={handleLogin} noValidate>
        {contaCriada && !erro && (
          <Alert type="success" title="Conta criada">
            Faça login para continuar.
          </Alert>
        )}
        {erro && <Alert type="danger">{erro}</Alert>}

        <Field label="E-mail" htmlFor="login-email" error={erros.email}>
          {(props) => (
            <div className="input-wrap input-wrap--icon">
              <Mail className="input-wrap__icon" aria-hidden="true" />
              <input
                {...props}
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="nome@exemplo.com"
              />
            </div>
          )}
        </Field>

        <Field label="Senha" htmlFor="login-senha" error={erros.senha}>
          {(props) => (
            <PasswordInput {...props} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" block loading={carregando} loadingText="Entrando…">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Login;
