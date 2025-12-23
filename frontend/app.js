const API_BASE = window.API_BASE_URL || "http://127.0.0.1:3001/api";

const $ = (selector) => document.querySelector(selector);

const ciState = {
  loading: false,
  projects: []
};

const testCatalog = ["Lint", "Unit Tests", "Integration Tests", "E2E Smoke"];

function renderProfile(profile) {
  $("#name").textContent = profile.name;
  $("#title").textContent = profile.title;
  $("#summary").textContent = profile.summary;
  $("#about").textContent = `Localização: ${profile.location}`;

  const github = $("#github");
  const linkedin = $("#linkedin");
  github.href = profile.contacts.github;
  linkedin.href = profile.contacts.linkedin;

  const skillsEl = $("#skills");
  skillsEl.innerHTML = "";
  profile.skills.forEach((skill) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = skill;
    skillsEl.appendChild(chip);
  });
}

async function loadData() {
  try {
    const [profileRes, projectsRes, testRunsRes] = await Promise.all([
      fetch(`${API_BASE}/profile`),
      fetch(`${API_BASE}/projects`),
      fetch(`${API_BASE}/test-runs`)
    ]);

    if (!profileRes.ok || !projectsRes.ok || !testRunsRes.ok) {
      throw new Error("Falha ao buscar dados");
    }

    const profile = await profileRes.json();
    const projects = await projectsRes.json();
    const testRuns = await testRunsRes.json();

    ciState.projects = projects;

    renderProfile(profile);
    renderCiProjects(projects, testRuns);

    const back = $("#project-back");
    if (back) {
      back.onclick = () => {
        location.hash = "";
      };
    }

    window.addEventListener("hashchange", () => {
      renderProjectScreen();
    });

    renderProjectScreen();
  } catch (error) {
    console.error(error);
    $("#summary").textContent = "Não foi possível carregar a API. Verifique se o backend está rodando.";
  }
}

function renderCiProjects(projects, testRuns) {
  const statusDot = $("#status-dot");
  const statusText = $("#status-text");
  const list = $("#ci-projects");

  const githubProjects = projects.filter((p) => p.source === "github");
  list.innerHTML = "";

  if (!githubProjects.length) {
    statusDot.className = "status-dot idle";
    statusText.textContent = "Nenhum repositório do GitHub encontrado.";
    return;
  }

  const latest = testRuns && testRuns.length ? testRuns[0] : null;
  if (!latest) {
    statusDot.className = "status-dot idle";
    statusText.textContent = "Nenhum teste executado.";
  } else {
    statusDot.className = latest.status === "failed" ? "status-dot failed" : "status-dot success";
    const formattedDate = new Date(latest.finishedAt).toLocaleString("pt-BR");
    statusText.textContent = `Último: ${formattedDate} • ${latest.branch}`;
  }

  githubProjects.forEach((project) => {
    const li = document.createElement("li");
    li.className = "ci-item";

    const meta = document.createElement("div");
    meta.className = "meta";

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "project-link";
    nameBtn.textContent = project.name;
    nameBtn.addEventListener("click", () => {
      location.hash = `#project=${encodeURIComponent(project.id)}`;
    });

    const repoLine = document.createElement("span");
    repoLine.textContent = project.repoUrl || "";

    meta.appendChild(nameBtn);
    meta.appendChild(repoLine);

    const projectRuns = (testRuns || []).filter((r) => r.projectId === project.id);
    const latestRun = projectRuns.length ? projectRuns[0] : null;

    const badge = document.createElement("span");
    badge.className = `ci-badge ${latestRun?.status === "failed" ? "failed" : "success"}`;
    badge.textContent = latestRun ? (latestRun.status === "failed" ? "Failed" : latestRun.status) : "Idle";

    const actions = document.createElement("div");
    actions.className = "ci-actions-inline";

    const select = document.createElement("select");
    select.className = "branch-select";
    ["master"].forEach((branch) => {
      const opt = document.createElement("option");
      opt.value = branch;
      opt.textContent = branch;
      select.appendChild(opt);
    });

    const runBtn = document.createElement("button");
    runBtn.className = "button small";
    runBtn.textContent = "Run";
    runBtn.addEventListener("click", () => {
      openModal({ project, branchSelect: select, projects });
    });

    actions.appendChild(select);
    actions.appendChild(runBtn);

    li.appendChild(meta);
    li.appendChild(actions);
    li.appendChild(badge);
    list.appendChild(li);
  });
}

async function fetchActionsRuns(repoFullName) {
  const res = await fetch(`${API_BASE}/actions/runs?repoFullName=${encodeURIComponent(repoFullName)}`);
  if (!res.ok) {
    throw new Error("Falha ao buscar histórico do Actions");
  }
  return res.json();
}

function showScreen(screen) {
  const home = $("#screen-home");
  const project = $("#screen-project");
  if (!home || !project) return;

  if (screen === "project") {
    home.classList.add("hidden");
    project.classList.remove("hidden");
  } else {
    project.classList.add("hidden");
    home.classList.remove("hidden");
  }
}

function getProjectIdFromHash() {
  const hash = (location.hash || "").replace(/^#/, "");
  if (!hash.startsWith("project=")) return null;
  const value = hash.slice("project=".length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function renderProjectScreen() {
  const projectId = getProjectIdFromHash();
  if (!projectId) {
    showScreen("home");
    return;
  }

  const project = (ciState.projects || []).find((p) => p.id === projectId);
  if (!project || project.source !== "github") {
    showScreen("home");
    return;
  }

  showScreen("project");

  const title = $("#project-title");
  const repo = $("#project-repo");
  const dot = $("#actions-dot");
  const text = $("#actions-text");
  const list = $("#actions-runs");

  title.textContent = `Projeto selecionado: ${project.name}`;
  repo.textContent = project.repoFullName || project.repoUrl || "";
  list.innerHTML = "";
  dot.className = "status-dot idle";
  text.textContent = "Carregando...";

  try {
    const runs = await fetchActionsRuns(project.repoFullName);
    if (!Array.isArray(runs) || runs.length === 0) {
      dot.className = "status-dot idle";
      text.textContent = "Nenhuma execução encontrada.";
      return;
    }

    const latest = runs[0];
    const ok = latest.conclusion === "success";
    dot.className = ok ? "status-dot success" : latest.conclusion ? "status-dot failed" : "status-dot idle";
    text.textContent = `Total: ${runs.length}`;

    runs.forEach((run) => {
      const li = document.createElement("li");
      li.className = "ci-item";

      const meta = document.createElement("div");
      meta.className = "meta";

      const strong = document.createElement("strong");
      strong.textContent = run.title || `Run #${run.runNumber || run.id}`;

      const when = document.createElement("span");
      const date = run.finishedAt
        ? new Date(run.finishedAt)
        : run.createdAt
          ? new Date(run.createdAt)
          : null;
      when.textContent = date ? date.toLocaleString("pt-BR") : "";

      meta.appendChild(strong);
      meta.appendChild(when);

      const actions = document.createElement("div");
      actions.className = "ci-actions-inline";

      const link = document.createElement("a");
      link.className = "button secondary small";
      link.target = "_blank";
      link.rel = "noreferrer";
      link.href = run.url || "#";
      link.textContent = "Abrir";
      actions.appendChild(link);

      const badge = document.createElement("span");
      const status = (run.conclusion || run.status || "").toLowerCase();
      const failed = status && status !== "success" && status !== "passed";
      badge.className = `ci-badge ${failed ? "failed" : "success"}`;
      badge.textContent = status ? status : "unknown";

      li.appendChild(meta);
      li.appendChild(actions);
      li.appendChild(badge);
      list.appendChild(li);
    });
  } catch (error) {
    console.error(error);
    dot.className = "status-dot failed";
    text.textContent = "Falha ao buscar histórico.";
  }
}

async function loadTestRunsOnly(projects) {
  try {
    const res = await fetch(`${API_BASE}/test-runs`);
    if (!res.ok) {
      throw new Error("Falha ao buscar histórico de testes");
    }
    const testRuns = await res.json();
    renderCiProjects(projects, testRuns);
  } catch (error) {
    console.error(error);
  }
}

function openModal({ project, branchSelect, projects }) {
  const modal = $("#modal");
  const title = $("#modal-title");
  const desc = $("#modal-desc");
  const list = $("#modal-tests");
  const confirmBtn = $("#modal-confirm");
  const cancelBtn = $("#modal-cancel");

  title.textContent = `Rodar testes em ${project.name}`;
  desc.textContent = `Branch: ${branchSelect.value}`;
  list.innerHTML = "";
  testCatalog.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });

  const close = () => {
    modal.classList.add("hidden");
  };

  // Fecha ao clicar fora do conteúdo
  modal.onclick = (e) => {
    if (e.target === modal) {
      close();
    }
  };

  // Limpa handlers anteriores para evitar múltiplos binds
  cancelBtn.onclick = null;
  confirmBtn.onclick = null;

  cancelBtn.onclick = close;
  confirmBtn.onclick = async () => {
    if (ciState.loading) return;
    ciState.loading = true;
    confirmBtn.textContent = "Rodando...";
    confirmBtn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/test-runs/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: branchSelect.value, projectId: project.id })
      });
      if (!res.ok) {
        throw new Error("Falha ao iniciar testes");
      }
      await loadTestRunsOnly(projects);
      close();
    } catch (error) {
      console.error(error);
      alert("Não foi possível executar os testes agora.");
    } finally {
      ciState.loading = false;
      confirmBtn.textContent = "Confirmar";
      confirmBtn.disabled = false;
    }
  };

  modal.classList.remove("hidden");
}

if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") {
  globalThis.__APP_TEST_EXPORTS__ = {
    renderProfile,
    renderCiProjects,
    openModal,
    renderProjectScreen
  };
} else {
  loadData();
}
