import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL (stack on http://localhost)");

test("home and catalog render", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText(/двер/i);
  await page.goto("/catalog");
  await expect(page.locator("body")).toBeVisible();
});

test("health is live", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok" });
});
