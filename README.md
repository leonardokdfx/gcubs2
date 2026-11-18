# Visitas Domiciliares (Next.js)

Frontend e backend no mesmo projeto Next.js (App Router):

- Telas: `src/app/**/page.jsx`, que renderizam os componentes de `src/views`
- API interna: `src/app/api/**/route.js` (mesmas rotas do antigo Express: `/api/auth/*`, `/api/pacientes/*`, `/api/health`)
- Banco: MongoDB via Mongoose (`src/server`), com a conexão reaproveitada entre as invocações serverless

O frontend chama `/api` na mesma origem, então não precisa mais de CORS nem de URL de backend separada.

## Rodar localmente

```bash
cd web
npm install
cp .env.example .env.local   # preencha MONGO_URI e JWT_SECRET
npm run dev                  # http://localhost:3000
```

## Publicar na Vercel

1. Suba o repositório para o GitHub (o `.gitignore` já impede que o `.env.local` vá junto).
2. Na Vercel, clique em **Add New → Project** e importe o repositório.
3. Em **Root Directory**, selecione `web`. O framework (Next.js) é detectado sozinho.
4. Em **Environment Variables**, adicione:
   - `MONGO_URI`: a string de conexão do MongoDB Atlas
   - `JWT_SECRET`: a mesma chave usada hoje (assim os logins atuais continuam valendo)
5. Clique em **Deploy**.
6. No MongoDB Atlas, em **Network Access**, libere `0.0.0.0/0`. A Vercel não tem IP fixo.

Pela CLI: `cd web && npx vercel` e, depois, `npx vercel --prod`.

## Hospedar em infraestrutura própria (ex.: CeTIC-DF)

O build gera um servidor Node autocontido (`output: "standalone"` em `next.config.mjs`),
sem depender da Vercel. O Decreto nº 48.899/2026 pede hospedagem em infraestrutura
corporativa sempre que possível.

```bash
docker build -t visitas-domiciliares .
docker run -p 3000:3000 -e MONGO_URI=... -e JWT_SECRET=... visitas-domiciliares
```

Sem Docker: `npm ci && npm run build`, depois copie `public/` para `.next/standalone/public`
e `.next/static` para `.next/standalone/.next/static`, e rode `node .next/standalone/server.js`.

- Sirva sempre por HTTPS (a política de segurança envia `upgrade-insecure-requests` e HSTS).
- Restrinja o acesso de rede do MongoDB ao servidor da aplicação; não use `0.0.0.0/0` em produção.
- `/api/health` responde `{"status":"ok"}` para o monitoramento.
