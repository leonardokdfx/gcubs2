"use client";

import React from "react";
import { MapPinOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ButtonLink, EmptyState } from "../components/ui";

function NaoEncontrada() {
  const { user } = useAuth();
  return (
    <main className="not-found">
      <div className="paper" style={{ maxWidth: 480, width: "100%" }}>
        <EmptyState
          icon={MapPinOff}
          title="Página não encontrada"
          action={
            <ButtonLink to={user ? "/dashboard" : "/"} variant="primary">
              {user ? "Voltar para o início" : "Ir para o login"}
            </ButtonLink>
          }
        >
          O endereço pode ter sido digitado errado ou a página não existe mais.
        </EmptyState>
      </div>
    </main>
  );
}

export default NaoEncontrada;
