// Client central de chamadas à API.
// Base URL vem de uma variável de ambiente (REACT_APP_API_URL),
// então basta trocar o .env para apontar para produção/nuvem
// sem alterar nenhuma linha de código.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * Cria um client de API. Equipe (agentes/supervisor) e portal do paciente
 * usam sessões separadas no navegador, cada uma com sua chave de token.
 *
 * O wrapper de fetch:
 * - monta a URL a partir da BASE_URL
 * - injeta o header Authorization automaticamente quando há token
 * - padroniza tratamento de erro (lança Error com a mensagem do backend)
 * - desloga automaticamente se o token expirar/for inválido (401)
 */
export function criarApi({ chaveToken, chaveUsuario, paginaLogin }) {
  async function apiFetch(path, { method = "GET", body, headers = {}, auth = true } = {}) {
    const finalHeaders = { "Content-Type": "application/json", ...headers };

    if (auth) {
      const token = localStorage.getItem(chaveToken);
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }

    let resposta;
    try {
      resposta = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error("Não foi possível conectar ao servidor. Verifique sua internet.");
    }

    if (resposta.status === 401 && auth) {
      localStorage.removeItem(chaveToken);
      localStorage.removeItem(chaveUsuario);
      if (window.location.pathname !== paginaLogin) {
        window.location.href = paginaLogin;
      }
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    let data = null;
    const contentType = resposta.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await resposta.json();
    }

    if (!resposta.ok) {
      throw new Error((data && data.message) || "Ocorreu um erro inesperado.");
    }

    return data;
  }

  return {
    get: (path, opts) => apiFetch(path, { ...opts, method: "GET" }),
    post: (path, body, opts) => apiFetch(path, { ...opts, method: "POST", body }),
    put: (path, body, opts) => apiFetch(path, { ...opts, method: "PUT", body }),
    delete: (path, opts) => apiFetch(path, { ...opts, method: "DELETE" }),
  };
}

export const api = criarApi({ chaveToken: "token", chaveUsuario: "usuario", paginaLogin: "/" });

export default api;
