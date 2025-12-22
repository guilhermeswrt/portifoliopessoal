# Portfólio Pessoal
Projeto para divulgar currículo e projetos de forma segura, sem login, com backend em Docker.

## Objetivos
- Página web com apresentação do currículo.
- Visualização e teste rápido dos projetos (links para demos/StackBlitz/GitHub Pages).
- Base para CI/CD.
- Futuro: rodar projetos localmente para quem acessa.

## Stack atual
- Frontend estático (HTML/CSS/JS) consumindo a API.
- Backend Node.js/Express com headers de segurança, CORS configurável e rate limiting.
- Docker para empacotar e rodar o backend.

## Estrutura
- `frontend/`: página estática que consome a API e exibe perfil/projetos.
- `backend/`: API segura com dados do currículo e projetos.
- `docker-compose.yml`: sobe backend e frontend em Docker.

## Integração com GitHub
- Defina as variáveis no backend (ou no `docker-compose.yml`):
	- `GITHUB_USERNAME`: seu usuário do GitHub (obrigatório).
	- `GITHUB_TOKEN`: obrigatório para listar projetos e disparar workflows.
	- `GITHUB_REPOS_LIMIT`: quantos repositórios recentes trazer (padrão 6).
	- `GITHUB_WORKFLOW_FILENAME`: nome do workflow disparado (default `ci.yml`).
- A configuração inicial (`npm start` ou `npm run dev:start`) abre o fluxo de autenticação, pede usuário e token uma única vez e salva em `.env`; os valores salvos são usados para listar projetos.
- A rota `/api/projects` mescla os projetos estáticos de `data.js` com os repositórios do GitHub mais recentes.
- Cache em memória reduz chamadas à API do GitHub.

## Como rodar o backend em Docker
1. `docker compose up --build`
2. A API sobe em `http://localhost:3001` e o frontend em `http://localhost:8080`.
3. Variáveis principais (podem ser ajustadas no `docker-compose.yml`):
	- `PORT`: porta exposta (default 3001).
	- `ALLOWED_ORIGINS`: lista de origens permitidas para CORS, separadas por vírgula (já inclui http://localhost:8080).

## Como rodar em modo dev (sem Docker)
```bash
cd backend
npm install
npm run dev
# API em http://localhost:3001
```

## Frontend
```bash
cd frontend
npm install
npm run dev
# página em http://localhost:5173 consumindo http://localhost:3001/api
```
- Para apontar a página para outra API, defina `window.API_BASE_URL` antes de carregar `app.js`, ou edite `app.js`.

## Próximos passos sugeridos
- Trocar dados mockados em `backend/src/data.js` pelos dados reais.
- Publicar a página estática (GitHub Pages, Vercel ou S3 + CloudFront).
- Configurar CI/CD (ex.: GitHub Actions) para build e deploy automático do backend Docker e do frontend estático.
- Adicionar monitoramento básico (healthcheck já disponível em `/api/health`).