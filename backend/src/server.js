import fs from "fs";
import path from "path";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { profile, projects } from "./data.js";

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env")
  ];

  candidates.forEach((file) => {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line) => {
      if (!line || line.startsWith("#") || !line.includes("=")) return;
      const [key, ...rest] = line.split("=");
      const value = rest.join("=").trim();
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  });
}

loadEnv();

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPOS_LIMIT = Number(process.env.GITHUB_REPOS_LIMIT || 6);
const GITHUB_WORKFLOW_FILENAME = process.env.GITHUB_WORKFLOW_FILENAME || "ci.yml";
const GITHUB_CACHE_MS = 10 * 60 * 1000;
const MAX_TEST_RUNS = 20;

const githubCache = {
  data: [],
  expires: 0
};

const testRuns = [];

const app = express();
const PORT = process.env.PORT || 3001;

app.disable("x-powered-by");

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  optionsSuccessStatus: 200
};

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "256kb" }));
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

async function fetchGitHubProjects() {
  if (process.env.NODE_ENV === "test") {
    return [];
  }

  if (!GITHUB_USERNAME) {
    throw new Error("GITHUB_USERNAME nao configurado");
  }

  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN nao configurado para listar repos");
  }

  const now = Date.now();
  if (githubCache.data.length && githubCache.expires > now) {
    return githubCache.data;
  }

  const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=${GITHUB_REPOS_LIMIT}`;
  const headers = {
    "User-Agent": "portfolio-backend",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${GITHUB_TOKEN}`
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API status ${response.status}`);
  }

  const repos = await response.json();

  const mapped = repos.map((repo) => ({
    id: `gh-${repo.id}`,
    name: repo.name,
    description: repo.description || "Projeto sem descrição",
    tech: repo.topics?.length ? repo.topics : repo.language ? [repo.language] : [],
    liveUrl: repo.homepage || repo.html_url,
    repoUrl: repo.html_url,
    demoUrl: repo.homepage || "",
    repoFullName: repo.full_name,
    source: "github"
  }));

  githubCache.data = mapped;
  githubCache.expires = now + GITHUB_CACHE_MS;
  return mapped;
}

function simulateTestRun(branch, projectId, projectName) {
  const fail = Math.random() < 0.25;
  const failed = fail ? Math.floor(Math.random() * 3) + 1 : 0;
  const passed = 20 + Math.floor(Math.random() * 10);
  const finishedAt = new Date().toISOString();

  return {
    id: `run-${Date.now()}`,
    branch,
    status: failed > 0 ? "failed" : "passed",
    passed,
    failed,
    total: passed + failed,
    finishedAt,
    projectId,
    projectName
  };
}

async function triggerGitHubWorkflow(repoFullName, branch) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN nao configurado para rodar workflows reais");
  }

  const url = `https://api.github.com/repos/${repoFullName}/actions/workflows/${GITHUB_WORKFLOW_FILENAME}/dispatches`;
  const headers = {
    "User-Agent": "portfolio-backend",
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };

  const body = { ref: branch };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Falha ao disparar workflow GitHub: status ${response.status}`);
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/profile", (req, res) => {
  res.json(profile);
});

app.get("/api/projects", async (req, res) => {
  const payload = [...projects];
  try {
    const githubProjects = await fetchGitHubProjects();
    payload.push(...githubProjects);
  } catch (error) {
    console.error("Falha ao buscar projetos do GitHub", error);
  }
  res.json(payload);
});

app.get("/api/projects/:id", async (req, res) => {
  const localProject = projects.find((p) => p.id === req.params.id);
  if (localProject) {
    return res.json(localProject);
  }

  try {
    const githubProjects = await fetchGitHubProjects();
    const project = githubProjects.find((p) => p.id === req.params.id);
    if (project) {
      return res.json(project);
    }
  } catch (error) {
    console.error("Falha ao buscar projeto individual do GitHub", error);
  }

  return res.status(404).json({ error: "Projeto não encontrado" });
});

app.get("/api/test-runs", (req, res) => {
  res.json(testRuns);
});

app.get("/api/test-runs/latest", (req, res) => {
  if (!testRuns.length) {
    return res.json({ message: "Nenhum teste executado" });
  }
  return res.json(testRuns[0]);
});

app.post("/api/test-runs/run", async (req, res) => {
  const branch = typeof req.body?.branch === "string" ? req.body.branch.trim() : "";
  const projectId = typeof req.body?.projectId === "string" ? req.body.projectId.trim() : "";

  if (!branch) {
    return res.status(400).json({ error: "Branch é obrigatória" });
  }

  let projectName = "Global";

  try {
    const githubProjects = await fetchGitHubProjects();
    const allProjects = [...projects, ...githubProjects];
    const targetProject = allProjects.find((p) => p.id === projectId);

    if (projectId && !targetProject) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    if (targetProject?.source === "github") {
      if (!targetProject.repoFullName) {
        throw new Error("Projeto GitHub sem repoFullName");
      }
      await triggerGitHubWorkflow(targetProject.repoFullName, branch);
      projectName = targetProject.name;

      const run = {
        id: `run-${Date.now()}`,
        branch,
        status: "queued",
        passed: 0,
        failed: 0,
        total: 0,
        finishedAt: new Date().toISOString(),
        projectId,
        projectName,
        provider: "github-actions"
      };

      testRuns.unshift(run);
      if (testRuns.length > MAX_TEST_RUNS) {
        testRuns.length = MAX_TEST_RUNS;
      }

      return res.status(201).json(run);
    }

    projectName = targetProject?.name || "Global";
    const run = simulateTestRun(branch, projectId, projectName);
    testRuns.unshift(run);
    if (testRuns.length > MAX_TEST_RUNS) {
      testRuns.length = MAX_TEST_RUNS;
    }

    return res.status(201).json(run);
  } catch (error) {
    console.error("Falha ao executar testes", error);
    return res.status(500).json({ error: "Falha ao executar testes" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err); // Log controlado para troubleshooting
  res.status(500).json({ error: "Erro interno" });
});

let serverInstance;
if (process.env.NODE_ENV !== "test") {
  serverInstance = app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
}

export { app, serverInstance };
