import "../app.js";

import { profileFixture } from "./fixtures/profile.js";
import { projectsFixture, testRunsFixture } from "./fixtures/testRuns.js";

const getExports = () => {
  const exportsObj = globalThis.__APP_TEST_EXPORTS__;
  if (!exportsObj) {
    throw new Error("__APP_TEST_EXPORTS__ não encontrado. NODE_ENV=test está configurado?");
  }
  return exportsObj;
};

const baseDom = () => {
  document.body.innerHTML = `
    <section id="screen-project" class="hidden">
      <h2 id="project-title"></h2>
      <button id="project-back"></button>
      <p id="project-repo"></p>
      <span id="actions-dot"></span>
      <span id="actions-text"></span>
      <ul id="actions-runs"></ul>
    </section>

    <div id="screen-home">
    <h1 id="name"></h1>
    <p id="title"></p>
    <p id="summary"></p>
    <div id="about"></div>
    <a id="github"></a>
    <a id="linkedin"></a>
    <div id="skills"></div>

    <span id="status-dot" class="status-dot idle"></span>
    <span id="status-text"></span>
    <ul id="ci-projects"></ul>

    <div id="modal" class="modal hidden"></div>
    <div id="modal-title"></div>
    <div id="modal-desc"></div>
    <ul id="modal-tests"></ul>
    <button id="modal-confirm"></button>
    <button id="modal-cancel"></button>

    </div>
  `;
};

describe("frontend/app.js", () => {
  beforeEach(() => {
    baseDom();
  });

  it("renderProfile preenche nome/título/links e skills", () => {
    const { renderProfile } = getExports();

    renderProfile(profileFixture);

    expect(document.querySelector("#name").textContent).toBe("Fulano");
    expect(document.querySelector("#title").textContent).toBe("QA");
    expect(document.querySelector("#summary").textContent).toBe("Resumo");
    expect(document.querySelector("#about").textContent).toContain("Joinville");

    expect(document.querySelector("#github").getAttribute("href")).toBe("https://github.com/x");
    expect(document.querySelector("#linkedin").getAttribute("href")).toBe("https://linkedin.com/in/x");

    const chips = document.querySelectorAll("#skills .chip");
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toBe("JS");
  });

  it("renderCiProjects mostra estado idle quando não há projetos GitHub", () => {
    const { renderCiProjects } = getExports();

    renderCiProjects([{ id: "1", name: "Local", source: "local" }], []);

    expect(document.querySelector("#status-dot").className).toContain("idle");
    expect(document.querySelector("#status-text").textContent).toContain("Nenhum repositório");
    expect(document.querySelectorAll("#ci-projects li").length).toBe(0);
  });

  it("renderCiProjects lista projeto GitHub e badge de status", () => {
    const { renderCiProjects } = getExports();

    renderCiProjects(projectsFixture, testRunsFixture);

    expect(document.querySelectorAll("#ci-projects li").length).toBe(1);
    const badge = document.querySelector(".ci-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent.toLowerCase()).toContain("failed");
  });
});
