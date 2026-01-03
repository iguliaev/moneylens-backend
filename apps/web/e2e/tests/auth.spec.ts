import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  supabaseAdmin,
} from "../utils/test-helpers";

test.describe("Authentication", () => {
  test("user can create an account", async ({ page }) => {
    test.skip(!!process.env.CI, "Sign‑up test only runs locally");
    const email = `new-user-${Date.now()}@example.com`;
    const password = "SecurePass123!";

    await page.goto("/register");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('input[type="submit"]');

    // Check for success message or redirect
    await expect(page).toHaveURL(/\/(dashboard|login)/, { timeout: 15000 });

    // Cleanup: find user via admin list and delete if present
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const user = (data as any).users?.find((u: any) => u.email === email);
    if (user) await deleteTestUser(user.id);
  });

  test("user can login with email/password", async ({ page }) => {
    const { email, password, userId } = await createTestUser();

    try {
      await page.goto("/login");
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('input[type="submit"]');

      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
      await expect(page.locator("body")).toContainText(/spend|earn|save/i);
    } finally {
      await deleteTestUser(userId);
    }
  });

  test("user can logout", async ({ page }) => {
    const { email, password, userId } = await createTestUser();

    try {
      await page.goto("/login");
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('input[type="submit"]');
      await page.waitForURL("/dashboard");

      await page.getByRole("button", { name: "Logout" }).click();

      await expect(page).toHaveURL("/login", { timeout: 5000 });
    } finally {
      await deleteTestUser(userId);
    }
  });
});
