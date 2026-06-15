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

test.beforeEach(async ({ page }) => {
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
  await page.addInitScript(value => {
    localStorage.setItem("boby:auth:remember", "true");
    localStorage.setItem("sb-wibpacyerlbajjnhtpud-auth-token", JSON.stringify(value));
  }, session);
});

test("navega entre dias, meses e anos", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#appShell")).toBeVisible();

  await page.locator("#openCalendarButton").click();
  await expect(page.locator("#calendarPanel")).toHaveClass(/open/);
  await expect(page.locator("#calendarGrid")).toBeVisible();

  await page.locator("#calendarPeriodButton").click();
  await expect(page.locator(".year-month")).toHaveCount(12);

  await page.locator("#calendarPeriodButton").click();
  await expect(page.locator(".year-option")).toHaveCount(12);

  await page.locator(".year-option").nth(5).click();
  await expect(page.locator(".year-month")).toHaveCount(12);
});
