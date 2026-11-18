"use client";

import React, { useState } from "react";
import api from "../services/api";
import { useAuth } from "../auth/AuthContext";
import AppLayout from "../components/AppLayout";
import { Alert, Avatar, Button, ButtonLink, Field, PageHeader, PasswordInput, Section } from "../components/ui";
import { useToast } from "../components/feedback";
import { rotuloPapel } from "../constants/dominio";
import { REQUISITOS_SENHA, erroSenha } from "../utils/senha";

function Perfil() {
  const { user, atualizarUser } = useAuth();
  const toast = useToast();

  const [perfil, setPerfil] = useState({
    nome: user?.nome || "",
    email: user?.email || "",
    foto: user?.foto || "",
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const alterar = (e) => {
    const { name, value } = e.target;
    setPerfil((p) => ({ ...p, [name]: value }));
    if (erros[name]) setErros((atual) => ({ ...atual, [name]: undefined }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setErro("");

    const novos = {};
    if (!perfil.nome.trim()) novos.nome = "Informe seu nome.";
    if (!perfil.email.trim()) novos.email = "Informe seu e-mail.";
    if (perfil.novaSenha && !perfil.senhaAtual) novos.senhaAtual = "Informe a senha atual para definir uma nova senha.";
    if (perfil.novaSenha && erroSenha(perfil.novaSenha)) novos.novaSenha = erroSenha(perfil.novaSenha);
    if (perfil.novaSenha && perfil.novaSenha !== perfil.confirmarSenha) novos.confirmarSenha = "As senhas não coincidem.";
    setErros(novos);
    const primeiro = ["nome", "email", "senhaAtual", "novaSenha", "confirmarSenha"].find((k) => novos[k]);
    if (primeiro) {
      document.getElementById(`perfil-${primeiro}`)?.focus();
      return;
    }

    setSalvando(true);
    try {
      const data = await api.put(`/auth/perfil/${user.id}`, {
        nome: perfil.nome.trim(),
        email: perfil.email.trim(),
        senhaAtual: perfil.senhaAtual,
        novaSenha: perfil.novaSenha,
        foto: perfil.foto.trim(),
      });
      atualizarUser(data.user);
      setPerfil((p) => ({ ...p, senhaAtual: "", novaSenha: "", confirmarSenha: "" }));
      toast.sucesso(perfil.novaSenha ? "Perfil e senha atualizados." : "Perfil atualizado.");
    } catch (err) {
      setErro(err.message || "Não foi possível atualizar o perfil.");
    } finally {
      setSalvando(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout semNavInferior estreito>
      <PageHeader breadcrumb={[{ label: "Configurações", to: "/config" }, { label: "Meu perfil" }]} title="Meu perfil" />

      <form onSubmit={handleSalvar} noValidate>
        <div className="stack">
          {erro && <Alert type="danger">{erro}</Alert>}

          <div className="paper" style={{ padding: "var(--space-5)" }}>
            <div className="profile-head">
              <Avatar nome={perfil.nome || user.nome} foto={perfil.foto} size={64} />
              <div style={{ minWidth: 0 }}>
                <p className="profile-head__name">{user.nome}</p>
                <div className="profile-head__meta">
                  <span className={`tag${user.role === "supervisor" ? " tag--primary" : ""}`}>{rotuloPapel(user)}</span>
                </div>
              </div>
            </div>
          </div>

          <Section title="Dados pessoais">
            <div className="form-grid">
              <Field label="Nome completo" required htmlFor="perfil-nome" error={erros.nome}>
                {(props) => <input {...props} type="text" name="nome" value={perfil.nome} onChange={alterar} className="input" autoComplete="name" />}
              </Field>
              <Field label="E-mail" required htmlFor="perfil-email" error={erros.email}>
                {(props) => (
                  <input
                    {...props}
                    type="email"
                    name="email"
                    value={perfil.email}
                    onChange={alterar}
                    className="input"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                )}
              </Field>
              <Field label="Endereço da foto" optional htmlFor="perfil-foto" hint="Link de uma imagem (https://…). Sem foto, mostramos suas iniciais.">
                {(props) => (
                  <input
                    {...props}
                    type="url"
                    name="foto"
                    value={perfil.foto}
                    onChange={alterar}
                    className="input"
                    placeholder="https://"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                )}
              </Field>
            </div>
          </Section>

          <Section title="Alterar senha" description="Deixe em branco para manter a senha atual.">
            <div className="form-grid">
              <Field label="Senha atual" htmlFor="perfil-senhaAtual" error={erros.senhaAtual}>
                {(props) => <PasswordInput {...props} name="senhaAtual" value={perfil.senhaAtual} onChange={alterar} autoComplete="current-password" />}
              </Field>
              <Field className="span-3" label="Nova senha" htmlFor="perfil-novaSenha" error={erros.novaSenha} hint={REQUISITOS_SENHA.map((r) => r.texto).join(" · ")}>
                {(props) => <PasswordInput {...props} name="novaSenha" value={perfil.novaSenha} onChange={alterar} autoComplete="new-password" />}
              </Field>
              <Field className="span-3" label="Confirmar nova senha" htmlFor="perfil-confirmarSenha" error={erros.confirmarSenha}>
                {(props) => (
                  <PasswordInput {...props} name="confirmarSenha" value={perfil.confirmarSenha} onChange={alterar} autoComplete="new-password" />
                )}
              </Field>
            </div>
          </Section>
        </div>

        <div className="action-bar">
          <ButtonLink to="/config">Voltar</ButtonLink>
          <Button type="submit" variant="primary" loading={salvando} loadingText="Salvando…">
            Salvar alterações
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

export default Perfil;
