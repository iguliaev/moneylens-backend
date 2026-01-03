import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  seedReferenceDataForUser,
  cleanupReferenceDataForUser,
  supabaseAdmin,
} from "../utils/test-helpers";

test.describe("Data Reset", () => {
  let testUser: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    testUser = await createTestUser();
  });

  test.afterAll(async () => {
    // Best-effort cleanup in case reset failed
    await cleanupReferenceDataForUser(testUser.userId);
    await deleteTestUser(testUser.userId);
  });

  test.beforeEach(async ({ page }) => {
    // Seed reference data and transactions before each test
    await seedReferenceDataForUser(testUser.userId);

    // Seed some transactions
    const now = new Date().toISOString();
    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("id, type")
      .eq("user_id", testUser.userId);

    const spendCat = categories?.find((c: any) => c.type === "spend");
    const earnCat = categories?.find((c: any) => c.type === "earn");
    const saveCat = categories?.find((c: any) => c.type === "save");

    await supabaseAdmin.from("transactions").insert([
      {
        user_id: testUser.userId,
        date: "2025-12-20",
        type: "spend",
        amount: 50.0,
        category: "Groceries",
        category_id: spendCat?.id,
        notes: "Test spend for reset",
        created_at: now,
        updated_at: now,
      },
      {
        user_id: testUser.userId,
        date: "2025-12-20",
        type: "earn",
        amount: 1000.0,
        category: "Salary",
        category_id: earnCat?.id,
        notes: "Test earn for reset",
        created_at: now,
        updated_at: now,
      },
      {
        user_id: testUser.userId,
        date: "2025-12-20",
        type: "save",
        amount: 200.0,
        category: "Savings",
        category_id: saveCat?.id,
        notes: "Test save for reset",
        created_at: now,
        updated_at: now,
      },
    ]);

    await loginUser(page, testUser.email, testUser.password);
  });

  test("user can reset all data", async ({ page }) => {
    // Verify data exists before reset
    await page.goto("/spend");
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "Test spend for reset" }),
    ).toBeVisible();

    await page.goto("/earn");
    await expect(
      page
        .getByTestId("earn-row-notes")
        .filter({ hasText: "Test earn for reset" }),
    ).toBeVisible();

    await page.goto("/save");
    await expect(
      page
        .getByTestId("save-row-notes")
        .filter({ hasText: "Test save for reset" }),
    ).toBeVisible();

    await page.goto("/settings/categories");
    await page.getByTestId("categories-type-spend").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "Groceries" }),
    ).toBeVisible();

    await page.goto("/settings/bank-accounts");
    await expect(
      page.getByTestId("bank-accounts-row").filter({ hasText: "Main Account" }),
    ).toBeVisible();

    await page.goto("/settings/tags");
    await expect(
      page.getByTestId("tags-row").filter({ hasText: "essentials" }),
    ).toBeVisible();

    // Navigate to settings and trigger reset
    await page.goto("/settings");
    await page.getByTestId("settings-reset-data-button").click();

    // Confirm in modal
    await page.getByTestId("data-reset-confirm-input").fill("DELETE");
    await page.getByTestId("data-reset-confirm").click();

    // Wait for success message
    await expect(page.getByTestId("data-reset-success")).toBeVisible({
      timeout: 15000,
    });

    // Verify all data is deleted

    // Transactions should be empty
    await page.goto("/spend");
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "Test spend for reset" }),
    ).not.toBeVisible();

    await page.goto("/earn");
    await expect(
      page
        .getByTestId("earn-row-notes")
        .filter({ hasText: "Test earn for reset" }),
    ).not.toBeVisible();

    await page.goto("/save");
    await expect(
      page
        .getByTestId("save-row-notes")
        .filter({ hasText: "Test save for reset" }),
    ).not.toBeVisible();

    // Categories should be empty
    await page.goto("/settings/categories");
    await page.getByTestId("categories-type-spend").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "Groceries" }),
    ).not.toBeVisible();

    // Bank accounts should be empty
    await page.goto("/settings/bank-accounts");
    await expect(
      page.getByTestId("bank-accounts-row").filter({ hasText: "Main Account" }),
    ).not.toBeVisible();

    // Tags should be empty
    await page.goto("/settings/tags");
    await expect(
      page.getByTestId("tags-row").filter({ hasText: "essentials" }),
    ).not.toBeVisible();
  });
});
