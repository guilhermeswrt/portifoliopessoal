const { test, expect } = require("@playwright/test");

test("UI: selecionar master, Run + Confirmar, aguardar CI finalizar com sucesso", async ({ page }) => {
  // Garante que o backend está pronto (evita falha de carregamento inicial da UI).
  await expect
    .poll(
      async () => {
        const res = await page.request.get("http://127.0.0.1:3001/api/health");
        return res.ok();
      },
      { timeout: 30_000 }
    )
    .toBe(true);

  await page.goto("/");

  // Se a UI falhou ao carregar a API, falha com um erro explícito.
  const summary = page.locator("#summary");
  await expect(summary).toBeVisible();
  const summaryText = ((await summary.textContent()) || "").toLowerCase();
  if (summaryText.includes("não foi possível carregar a api")) {
    throw new Error("A UI não conseguiu carregar a API do backend (verifique se http://127.0.0.1:3001 está acessível).");
  }

  // Aguarda a lista de projetos carregar (no modo E2E temos 1 projeto fake do GitHub)
  const projectItem = page.locator("#ci-projects .ci-item").first();
  await expect(projectItem).toBeVisible({ timeout: 30_000 });

  const branchSelect = projectItem.locator("select.branch-select");
  await branchSelect.selectOption("master");

  await projectItem.getByRole("button", { name: "Run" }).click();

  const modal = page.locator("#modal");
  await expect(modal).toBeVisible();
  await expect(page.locator("#modal-desc")).toContainText("Branch: master");

  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(modal).toHaveClass(/hidden/);

  // Logo após confirmar, deve ficar queued.
  await expect(projectItem.locator(".ci-badge")).toHaveText(/queued/i, { timeout: 10_000 });

  // Polling com reload a cada 2s, até ficar passed.
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2_000);
    await page.reload();

    const item = page.locator("#ci-projects .ci-item").first();
    await expect(item).toBeVisible();

    const badge = item.locator(".ci-badge");
    const text = ((await badge.textContent()) || "").trim().toLowerCase();

    if (text.includes("passed")) {
      await expect(badge).toHaveClass(/success/);
      return;
    }

    if (text.includes("failed")) {
      throw new Error("A execução terminou com falha (badge=failed)");
    }
  }

  throw new Error("Timeout aguardando a execução terminar com sucesso");
});
