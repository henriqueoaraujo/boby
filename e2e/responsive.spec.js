import { expect, test } from "@playwright/test";

const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
const session = {
  access_token: "e2e-access-token",
  refresh_token: "e2e-refresh-token",
  expires_in: 3600,
  expires_at: futureTimestamp,
  token_type: "bearer",
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "teste@boby.local",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Teste", city: "" },
    aud: "authenticated",
    role: "authenticated"
  }
};

async function mockSupabase(page) {
  await page.route("https://wibpacyerlbajjnhtpud.supabase.co/**", async route => {
    const request = route.request();
    if (request.url().includes("/auth/v1/settings")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external: { email: true } })
      });
      return;
    }
    if (request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
  });
}

async function expectNoHorizontalOverflow(page) {
  const hasOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth > window.innerWidth + 1
  ));
  expect(hasOverflow).toBe(false);
}

test("login e cadastro cabem no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSupabase(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#authPanel")).toHaveClass(/open/);
  await expectNoHorizontalOverflow(page);

  await page.locator("#authSignupTab").click();
  await expect(page.locator("#authPanel")).toHaveClass(/signup-mode/);
  await expectNoHorizontalOverflow(page);
});

test("agenda principal não cria overflow horizontal no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSupabase(page);
  await page.addInitScript(value => {
    localStorage.setItem("boby:auth:remember", "true");
    localStorage.setItem("sb-wibpacyerlbajjnhtpud-auth-token", JSON.stringify(value));
  }, session);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#appShell")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator("#dayAgendaViewButton").click();
  await expect(page.locator("#homeDayView")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator("#monthAgendaViewButton").click();
  await expect(page.locator("#homeMonthView")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator("#openTaskInputButton").click();
  await expect(page.locator("#inputCard")).not.toHaveClass(/collapsed/);
  await expectNoHorizontalOverflow(page);

  await page.locator("#openSearchButton").click();
  await expect(page.locator("#searchCard")).not.toHaveClass(/collapsed/);
  await expectNoHorizontalOverflow(page);
});
