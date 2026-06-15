import { expect, test } from "@playwright/test";

test("alterna suavemente entre login e cadastro", async ({ page }) => {
  await page.route("https://wibpacyerlbajjnhtpud.supabase.co/**", async route => {
    if (route.request().url().includes("/auth/v1/settings")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external: { email: true } })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#authPanel")).toHaveClass(/open/);
  await expect(page.locator("#authConfirmPasswordField")).toBeHidden();

  await page.locator("#authSignupTab").click();
  await expect(page.locator("#authPanel")).toHaveClass(/signup-mode/);
  await expect(page.locator("#authConfirmPasswordField")).toBeVisible();
  await expect(page.locator("#authCaptchaField")).toBeVisible();

  await page.locator("#authLoginTab").click();
  await expect(page.locator("#authPanel")).not.toHaveClass(/signup-mode/);
  await expect(page.locator("#authConfirmPasswordField")).toBeHidden();
});
