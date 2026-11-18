"use client";

import React from "react";
import { RotateCw } from "lucide-react";
import PortalLayout from "../../components/PortalLayout";
import { Alert, Button, PageHeader, Section, Skeleton } from "../../components/ui";
import { AvisoFuncionamento, PainelFuncionamento, haQuanto, useAgora, useFuncionamentoPublico } from "../../components/Funcionamento";
import { UNIDADE } from "../../constants/unidade";
import { exibirData } from "../../utils/agendamento";

function PortalUnidade() {
  const agora = useAgora();
  const { setores, erro, carregadoEm, recarregar } = useFuncionamentoPublico();

  return (
    <PortalLayout>
      <PageHeader
        breadcrumb={[{ label: "Início", to: "/paciente" }, { label: "Funcionamento hoje" }]}
        title="Funcionamento hoje"
        description={`Veja antes de sair de casa se a farmácia, o laboratório, a odontologia, a vacinação e o atendimento IPE da ${UNIDADE.nome} estão atendendo.`}
      />

      <div className="stack">
        {erro && (
          <Alert type="danger" action={<Button size="sm" icon={RotateCw} onClick={recarregar}>Tentar de novo</Button>}>
            {erro}
          </Alert>
        )}
        <Section
          title={exibirData(new Date(agora.toISOString().slice(0, 10) + "T12:00:00Z"), { weekday: "long", day: "numeric", month: "long" })}
          description={carregadoEm ? `Informações carregadas ${haQuanto(carregadoEm, agora)}. A página se atualiza sozinha.` : undefined}
          actions={
            <Button size="sm" variant="ghost" icon={RotateCw} onClick={recarregar}>
              Atualizar
            </Button>
          }
        >
          {setores ? (
            <PainelFuncionamento setores={setores} agora={agora} />
          ) : (
            !erro && (
              <div style={{ display: "grid", gap: 12 }} aria-busy="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} height={56} />
                ))}
              </div>
            )
          )}
          <AvisoFuncionamento />
        </Section>
      </div>
    </PortalLayout>
  );
}

export default PortalUnidade;
