import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  seedReferenceDataWithPrefix,
  seedTransactionsForUser,
  cleanupReferenceDataForUser,
} from "../utils/test-helpers";

test.describe("User Data Isolation", () => {
  let userA: { email: string; password: string; userId: string };
  let userB: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    // Create two test users sequentially (parallel creation can cause DB race conditions)
    userA = await createTestUser("userA");
    userB = await createTestUser("userB");

    // Seed distinct reference data for each user
    await seedReferenceDataWithPrefix(userA.userId, "userA");
    await seedReferenceDataWithPrefix(userB.userId, "userB");

    // Seed transactions with identifiable notes
    await seedTransactionsForUser(userA.userId, "userA");
    await seedTransactionsForUser(userB.userId, "userB");
  });

  test.afterAll(async () => {
    // Guard against cleanup if beforeAll failed
    if (userA?.userId) await cleanupReferenceDataForUser(userA.userId);
    if (userB?.userId) await cleanupReferenceDataForUser(userB.userId);
    if (userA?.userId) await deleteTestUser(userA.userId);
    if (userB?.userId) await deleteTestUser(userB.userId);
  });

  test.describe("Dashboard Isolation", () => {
    test("User A sees only their own totals on dashboard", async ({ page }) => {
      await loginUser(page, userA.email, userA.password);
      await page.goto("/dashboard");

      // User A's totals: spend=100, earn=500, save=200
      await expect(
        page.getByTestId("dashboard-spent-total-value"),
      ).toContainText("100");
      await expect(
        page.getByTestId("dashboard-earned-total-value"),
      ).toContainText("500");
      await expect(
        page.getByTestId("dashboard-saved-total-value"),
      ).toContainText("200");

      // Verify User A's categories appear, not User B's
      await expect(
        page
          .getByTestId("dashboard-category-name")
          .filter({ hasText: "userA-Groceries" }),
      ).toBeVisible();
      await expect(
        page
          .getByTestId("dashboard-category-name")
          .filter({ hasText: "userB-Groceries" }),
      ).not.toBeVisible();

      // Verify User A's tags appear, not User B's (tags panel isolation)
      await expect(
        page
          .getByTestId("dashboard-tag-names")
          .filter({ hasText: "userA-tag1" }),
      ).toBeVisible();
      await expect(
        page
          .getByTestId("dashboard-tag-names")
          .filter({ hasText: "userB-tag1" }),
      ).not.toBeVisible();
    });

    test("User B sees only their own totals on dashboard", async ({ page }) => {
      await loginUser(page, userB.email, userB.password);
      await page.goto("/dashboard");

      // User B's totals: spend=100, earn=500, save=200
      await expect(
        page.getByTestId("dashboard-spent-total-value"),
      ).toContainText("100");
      await expect(
        page.getByTestId("dashboard-earned-total-value"),
      ).toContainText("500");
      await expect(
        page.getByTestId("dashboard-saved-total-value"),
      ).toContainText("200");

      // Verify User B's categories appear, not User A's
      await expect(
        page
          .getByTestId("dashboard-category-name")
          .filter({ hasText: "userB-Groceries" }),
      ).toBeVisible();
      await expect(
        page
          .getByTestId("dashboard-category-name")
          .filter({ hasText: "userA-Groceries" }),
      ).not.toBeVisible();

      // Verify User B's tags appear, not User A's (tags panel isolation)
      await expect(
        page
          .getByTestId("dashboard-tag-names")
          .filter({ hasText: "userB-tag1" }),
      ).toBeVisible();
      await expect(
        page
          .getByTestId("dashboard-tag-names")
          .filter({ hasText: "userA-tag1" }),
      ).not.toBeVisible();
    });
  });

  test.describe("Transaction Pages Isolation", () => {
    test("Spend page shows only current user's transactions", async ({
      page,
    }) => {
      await loginUser(page, userA.email, userA.password);
      await page.goto("/spend");

      // User A's transaction visible
      await expect(
        page
          .getByTestId("spend-row-notes")
          .filter({ hasText: "userA-spend-transaction" }),
      ).toBeVisible();

      // User B's transaction NOT visible
      await expect(
        page
          .getByTestId("spend-row-notes")
          .filter({ hasText: "userB-spend-transaction" }),
      ).not.toBeVisible();

      // Total should reflect only User A's spend (100)
      await expect(
        page.getByTestId("spend-total-current-month-value"),
      ).toContainText("100");
    });

    test("Earn page shows only current user's transactions", async ({
      page,
    }) => {
      await loginUser(page, userA.email, userA.password);
      await page.goto("/earn");

      await expect(
        page
          .getByTestId("earn-row-notes")
          .filter({ hasText: "userA-earn-transaction" }),
      ).toBeVisible();
      await expect(
        page
          .getByTestId("earn-row-notes")
          .filter({ hasText: "userB-earn-transaction" }),
      ).not.toBeVisible();

      await expect(
        page.getByTestId("earn-total-current-month-value"),
      ).toContainText("500");
    });

    test("Save page shows only current user's transactions", async ({
      page,
    }) => {
      await loginUser(page, userA.email, userA.password);
      await page.goto("/save");

      await expect(
        page
          .getByTestId("save-row-notes")
          .filter({ hasText: "userA-save-transaction" }),
      ).toBeVisible();
      await expect(
        page
          .getByTestId("save-row-notes")
          .filter({ hasText: "userB-save-transaction" }),
      ).not.toBeVisible();

      await expect(
        page.getByTestId("save-total-current-month-value"),
      ).toContainText("200");
    });
  });

  test.describe("Settings Pages Isolation", () => {
    test("Categories page shows only current user's categories", async ({
      page,
    }) => {
      await loginUser(page, userA.email, userA.password);
      await page.goto("/settings/categories");
      await page.getByTestId("categories-type-spend").click();

      // User A's category visible
      await expect(
        page
          .getByTestId("categories-row")
          .filter({ hasText: "userA-Groceries" }),
      ).toBeVisible();

      // User B's category NOT visible
      await expect(
        page
          .getByTestId("categories-row")
          .filter({ hasText: "userB-Groceries" }),
      ).not.toBeVisible();
    });

    test("Tags page shows only current user's tags", async ({ page }) => {
      await loginUser(page, userA.email, userA.password);
      await page.goto("/settings/tags");

      await expect(
        page.getByTestId("tags-row").filter({ hasText: "userA-tag1" }),
      ).toBeVisible();
      await expect(
        page.getByTestId("tags-row").filter({ hasText: "userB-tag1" }),
      ).not.toBeVisible();
    });

    test("Bank accounts page shows only current user's accounts", async ({
      page,
    }) => {
      await loginUser(page, userA.email, userA.password);
      await page.goto("/settings/bank-accounts");

      await expect(
        page.getByTestId("bank-accounts-row").filter({ hasText: "userA-Bank" }),
      ).toBeVisible();
      await expect(
        page.getByTestId("bank-accounts-row").filter({ hasText: "userB-Bank" }),
      ).not.toBeVisible();
    });
  });
});
