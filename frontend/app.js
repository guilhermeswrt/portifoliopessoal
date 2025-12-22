const API_BASE = window.API_BASE_URL || "http://localhost:3001/api";

const $ = (selector) => document.querySelector(selector);

const ciState = {
  loading: false
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

    renderProfile(profile);
    renderCiProjects(projects, testRuns);
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
    meta.innerHTML = `
      <strong>${project.name}</strong>
      <span>${project.repoUrl || ""}</span>
    `;

    const projectRuns = (testRuns || []).filter((r) => r.projectId === project.id);
    const latestRun = projectRuns.length ? projectRuns[0] : null;

    const badge = document.createElement("span");
    badge.className = `ci-badge ${latestRun?.status === "failed" ? "failed" : "success"}`;
    badge.textContent = latestRun ? (latestRun.status === "failed" ? "Failed" : latestRun.status) : "Idle";

    const actions = document.createElement("div");
    actions.className = "ci-actions-inline";

    const select = document.createElement("select");
    select.className = "branch-select";
    ["main", "develop", "qa"].forEach((branch) => {
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

loadData();
