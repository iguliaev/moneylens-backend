import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  cleanupReferenceDataForUser,
} from "../utils/test-helpers";

test.describe("Settings: Categories CRUD", () => {
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
    await page.goto("/settings/categories");
  });

  for (const type of ["spend", "earn", "save"] as const) {
    test(`user can create/update/delete ${type} categories`, async ({
      page,
    }) => {
      const ts = Date.now();
      const name = `e2e-${type}-cat-${ts}`;
      const desc = `e2e-${type}-cat-desc-${ts}`;
      const updatedName = `${name}-updated`;
      const updatedDesc = `${desc}-updated`;

      // Click type tab
      await page.getByTestId(`categories-type-${type}`).click();

      // Create
      await page.getByTestId("categories-create-name").fill(name);
      await page.getByTestId("categories-create-description").fill(desc);
      await page.getByTestId("categories-create-submit").click();

      // Assert row appears
      const row = page.getByTestId("categories-row").filter({ hasText: name });
      await expect(row).toBeVisible();

      // Update
      await row.getByTestId("categories-row-edit").click();

      // We clicked on the edit button within the specific row,
      // so we expect the edit fields to be scoped to that row
      await page.getByTestId("categories-row-edit-name").fill(updatedName);
      await page
        .getByTestId("categories-row-edit-description")
        .fill(updatedDesc);
      await page.getByTestId("categories-row-save").click();

      // Assert updated
      await expect(
        page.getByTestId("categories-row").filter({ hasText: updatedName }),
      ).toBeVisible();

      // Delete
      const updatedRow = page
        .getByTestId("categories-row")
        .filter({ hasText: updatedName });
      await updatedRow.getByTestId("categories-row-delete").click();

      // Assert removed
      await expect(
        page.getByTestId("categories-row").filter({ hasText: updatedName }),
      ).not.toBeVisible();
    });
  }

  test("categories are separated by type", async ({ page }) => {
    const ts = Date.now();
    const spendName = `e2e-spend-separation-${ts}`;

    // Create spend category
    await page.getByTestId("categories-type-spend").click();
    await page.getByTestId("categories-create-name").fill(spendName);
    await page.getByTestId("categories-create-description").fill("separation");
    await page.getByTestId("categories-create-submit").click();

    await expect(
      page.getByTestId("categories-row").filter({ hasText: spendName }),
    ).toBeVisible();

    // Switch to earn tab - should not see spend category
    await page.getByTestId("categories-type-earn").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: spendName }),
    ).not.toBeVisible();

    // Switch to save tab - should not see spend category
    await page.getByTestId("categories-type-save").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: spendName }),
    ).not.toBeVisible();
  });
});
