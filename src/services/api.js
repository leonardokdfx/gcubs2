// Client central de chamadas à API.
// Base URL vem de uma variável de ambiente (REACT_APP_API_URL),
// então basta trocar o .env para apontar para produção/nuvem
// sem alterar nenhuma linha de código.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

function getToken() {
  return localStorage.getItem("token");
}

/**
 * Wrapper de fetch que:
 * - monta a URL a partir da BASE_URL
 * - injeta o header Authorization automaticamente quando há token
 * - padroniza tratamento de erro (lança Error com a mensagem do backend)
 * - desloga automaticamente se o token expirar/for inválido (401)
 */
async function apiFetch(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const finalHeaders = { "Content-Type": "application/json", ...headers };

  if (auth) {
    const token = getToken();
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

  if (resposta.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    if (window.location.pathname !== "/") {
      window.location.href = "/";
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

export const api = {
  get: (path, opts) => apiFetch(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => apiFetch(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => apiFetch(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) => apiFetch(path, { ...opts, method: "DELETE" }),
};

export default api;
