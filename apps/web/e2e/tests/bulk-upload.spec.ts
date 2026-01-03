import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  cleanupReferenceDataForUser,
} from "../utils/test-helpers";
import * as path from "path";

test.describe("Bulk Upload", () => {
  let testUser: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    testUser = await createTestUser();
  });

  test.afterAll(async () => {
    await cleanupReferenceDataForUser(testUser.userId);
    await deleteTestUser(testUser.userId);
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUser.email, testUser.password);
  });

  test("user can bulk upload valid JSON with all entity types", async ({
    page,
  }) => {
    await page.goto("/settings");

    // Upload valid JSON file
    const filePath = path.join(__dirname, "../fixtures/valid-bulk-upload.json");
    await page.getByTestId("bulk-upload-input").setInputFiles(filePath);

    // Verify preview appears
    await expect(page.getByTestId("bulk-upload-preview")).toBeVisible();

    // Click upload
    await page.getByTestId("bulk-upload-submit").click();

    // Verify success message
    await expect(page.getByTestId("bulk-upload-success")).toBeVisible();
    await expect(
      page.getByTestId("bulk-upload-categories-count"),
    ).toContainText("3");
    await expect(
      page.getByTestId("bulk-upload-bank-accounts-count"),
    ).toContainText("1");
    await expect(page.getByTestId("bulk-upload-tags-count")).toContainText("2");
    await expect(
      page.getByTestId("bulk-upload-transactions-count"),
    ).toContainText("3");

    // Verify categories in Settings
    await page.goto("/settings/categories");
    await page.getByTestId("categories-type-spend").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "e2e-spend-cat" }),
    ).toBeVisible();

    await page.getByTestId("categories-type-earn").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "e2e-earn-cat" }),
    ).toBeVisible();

    await page.getByTestId("categories-type-save").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "e2e-save-cat" }),
    ).toBeVisible();

    // Verify bank accounts in Settings
    await page.goto("/settings/bank-accounts");
    await expect(
      page
        .getByTestId("bank-accounts-row")
        .filter({ hasText: "e2e-bank-account" }),
    ).toBeVisible();

    // Verify tags in Settings
    await page.goto("/settings/tags");
    await expect(
      page.getByTestId("tags-row").filter({ hasText: "e2e-tag-1" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("tags-row").filter({ hasText: "e2e-tag-2" }),
    ).toBeVisible();

    // Verify transactions on pages
    await page.goto("/spend");
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "E2E spend transaction" }),
    ).toBeVisible();

    await page.goto("/earn");
    await expect(
      page
        .getByTestId("earn-row-notes")
        .filter({ hasText: "E2E earn transaction" }),
    ).toBeVisible();

    await page.goto("/save");
    await expect(
      page
        .getByTestId("save-row-notes")
        .filter({ hasText: "E2E save transaction" }),
    ).toBeVisible();
  });

  test("user sees error for invalid JSON syntax", async ({ page }) => {
    await page.goto("/settings");

    const filePath = path.join(__dirname, "../fixtures/invalid-json.json");
    await page.getByTestId("bulk-upload-input").setInputFiles(filePath);

    // File error should appear (parse error happens on file selection)
    await expect(page.getByTestId("bulk-upload-file-error")).toBeVisible();

    // Upload button should be disabled or file cleared
    await expect(page.getByTestId("bulk-upload-submit")).toBeDisabled();

    // No success message
    await expect(page.getByTestId("bulk-upload-success")).not.toBeVisible();
  });

  test("user sees error for invalid category type", async ({ page }) => {
    await page.goto("/settings");

    const filePath = path.join(
      __dirname,
      "../fixtures/invalid-category-type.json",
    );
    await page.getByTestId("bulk-upload-input").setInputFiles(filePath);

    // Preview should appear (JSON is valid, data is not)
    await expect(page.getByTestId("bulk-upload-preview")).toBeVisible();

    // Click upload
    await page.getByTestId("bulk-upload-submit").click();

    // Error should appear
    await expect(page.getByTestId("bulk-upload-file-error")).toBeVisible();

    // No success message
    await expect(page.getByTestId("bulk-upload-success")).not.toBeVisible();
  });
});
