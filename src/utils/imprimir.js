import { situacaoDe } from "../constants/dominio";
import { exibirCPF, exibirTelefone, enderecoCompleto } from "./formatos";

const escapar = (valor) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Abre uma janela de impressão com a lista de pacientes.
 * Os valores são escapados (nomes e endereços vêm de digitação livre).
 */
export function imprimirPacientes(pacientes, { titulo, subtitulo, mostrarEquipe = false }) {
  const emitidoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const linhas = pacientes
    .map(
      (p) => `
      <tr>
        <td><strong>${escapar(p.nome)}</strong></td>
        <td class="nowrap">${escapar(exibirCPF(p.cpf))}</td>
        <td class="nowrap">${escapar(exibirTelefone(p.telefone))}</td>
        ${mostrarEquipe ? `<td>${escapar(p.equipe)}</td>` : ""}
        <td>${escapar(enderecoCompleto(p))}${p.pontoReferencia ? `<br><small>${escapar(p.pontoReferencia)}</small>` : ""}</td>
        <td>${escapar(p.melhorHorario)}</td>
        <td>${escapar(situacaoDe(p.status).rotulo)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapar(titulo)}</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "IBM Plex Sans", "Segoe UI", Arial, sans-serif; color: #24252e; font-size: 11px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #0069d0; margin-bottom: 12px; }
  .sistema { font-size: 11px; color: #696979; }
  h1 { margin: 2px 0 0; font-size: 18px; }
  .meta { text-align: right; color: #696979; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; border-bottom: 1px solid #8f8fa2; padding: 6px; }
  td { padding: 6px; border-bottom: 1px solid #d3d4dd; vertical-align: top; }
  tr { break-inside: avoid; }
  small { color: #696979; }
  .nowrap { white-space: nowrap; }
  footer { margin-top: 12px; color: #696979; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="sistema">Visitas Domiciliares</div>
      <h1>${escapar(titulo)}</h1>
      ${subtitulo ? `<div>${escapar(subtitulo)}</div>` : ""}
    </div>
    <div class="meta">Emitido em ${escapar(emitidoEm)}<br>${pacientes.length} paciente(s)</div>
  </header>
  <table>
    <thead>
      <tr>
        <th>Nome</th><th>CPF</th><th>Telefone</th>${mostrarEquipe ? "<th>Equipe</th>" : ""}<th>Endereço</th><th>Melhor horário</th><th>Situação</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
</body>
</html>`;

  const janela = window.open("", "_blank", "width=960,height=720");
  if (!janela) return false;
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  // Pequeno atraso para o navegador montar a página antes do diálogo de impressão.
  setTimeout(() => janela.print(), 250);
  return true;
}
