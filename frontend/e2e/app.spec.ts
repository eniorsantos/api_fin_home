import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("deve carregar a página do dashboard", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Painel de Análise Financeira");
  });

  test("deve exibir lista de ativos para seleção (ou estado vazio)", async ({ page }) => {
    // Verifica se a página carrega sem erros (checkboxes ou estado vazio)
    const checkboxes = page.locator('input[type="checkbox"]');
    const hasAssets = await checkboxes.count() > 0;
    
    if (hasAssets) {
      await expect(checkboxes.first()).toBeVisible();
    } else {
      // Se não há ativos, a página ainda deve carregar sem erros
      await expect(page.locator("h1")).toContainText("Painel de Análise Financeira");
    }
  });

  test("deve permitir selecionar período", async ({ page }) => {
    const fromInput = page.locator('input[type="date"]').first();
    const toInput = page.locator('input[type="date"]').last();
    await expect(fromInput).toBeVisible();
    await expect(toInput).toBeVisible();
  });

  test("deve ter botão de sincronização", async ({ page }) => {
    const syncButton = page.locator('button:has-text("Sincronizar brapi")');
    await expect(syncButton).toBeVisible();
  });

  test("deve ter seletor de fonte de dados", async ({ page }) => {
    const sourceSelect = page.locator('select[title="Fonte dos preços"]');
    await expect(sourceSelect).toBeVisible();
    await expect(sourceSelect.locator('option[value=""]')).toHaveText("Preferencial");
  });

  test("deve ter seletor de benchmark", async ({ page }) => {
    const benchmarkSelect = page.locator('select[title="Benchmark"]');
    await expect(benchmarkSelect).toBeVisible();
    await expect(benchmarkSelect.locator('option[value="CDI"]')).toHaveText("CDI");
  });
});

test.describe("Ativos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ativos");
  });

  test("deve carregar a página de ativos", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Ativos");
  });

  test("deve ter botão para adicionar ativo", async ({ page }) => {
    const addButton = page.locator('button:has-text("Adicionar"), button:has-text("Novo")');
    await expect(addButton.first()).toBeVisible();
  });
});

test.describe("Carteira", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/carteira");
  });

  test("deve carregar a página de carteira", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Carteira");
  });
});

test.describe("Relatórios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/relatorios");
  });

  test("deve carregar a página de relatórios", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Relatórios");
  });
});

test.describe("Scorecard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/scorecard");
  });

  test("deve carregar a página de scorecard", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Scorecard Fundamentalista");
  });

  test("deve ter input para símbolos", async ({ page }) => {
    const input = page.locator('input[type="text"][placeholder*="PETR4"]');
    await expect(input).toBeVisible();
  });

  test("deve ter botão de analisar", async ({ page }) => {
    const button = page.locator('button[type="submit"]:has-text("Analisar")');
    await expect(button).toBeVisible();
  });
});

test.describe("Gráficos Avançados", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/graficos");
  });

  test("deve carregar a página de gráficos avançados", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Gráficos Avançados");
  });

  test("deve ter seletor de ativo", async ({ page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
  });

  test("deve ter botões de tipo de gráfico", async ({ page }) => {
    const buttons = page.locator('button:has-text("Candle"), button:has-text("Volume"), button:has-text("Histograma"), button:has-text("Drawdown")');
    await expect(buttons.first()).toBeVisible();
  });
});

test.describe("Relatórios Avançados", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/relatorios-avancados");
  });

  test("deve carregar a página de relatórios avançados", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Relatórios Avançados");
  });

  test("deve ter seletor de carteira", async ({ page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
  });
});

test.describe("Navegação", () => {
  test("deve navegar entre páginas via menu", async ({ page }) => {
    await page.goto("/");

    await page.click('a:has-text("Ativos")');
    await expect(page).toHaveURL(/.*ativos/);

    await page.click('a:has-text("Carteira")');
    await expect(page).toHaveURL(/.*carteira/);

    await page.click('a:has-text("Relatórios")');
    await expect(page).toHaveURL(/.*relatorios/);

    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL(/\/$/);
  });
});