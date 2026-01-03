import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  cleanupReferenceDataForUser,
} from "../utils/test-helpers";

test.describe("Settings: Bank accounts CRUD", () => {
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
    await page.goto("/settings/bank-accounts");
  });

  test("user can create/update/delete bank accounts", async ({ page }) => {
    const ts = Date.now();
    const name = `e2e-ba-${ts}`;
    const desc = `e2e-ba-desc-${ts}`;
    const updatedName = `${name}-updated`;
    const updatedDesc = `${desc}-updated`;

    // Create
    await page.getByTestId("bank-accounts-create-name").fill(name);
    await page.getByTestId("bank-accounts-create-description").fill(desc);
    await page.getByTestId("bank-accounts-create-submit").click();

    // Assert row appears
    const row = page.getByTestId("bank-accounts-row").filter({ hasText: name });
    await expect(row).toBeVisible();

    // Update
    await row.getByTestId("bank-accounts-row-edit").click();

    // We clicked on the edit button within the specific row,
    // so we expect the edit fields to be scoped to that row
    await page.getByTestId("bank-accounts-row-edit-name").fill(updatedName);
    await page
      .getByTestId("bank-accounts-row-edit-description")
      .fill(updatedDesc);
    await page.getByTestId("bank-accounts-row-save").click();

    // Assert updated
    await expect(
      page.getByTestId("bank-accounts-row").filter({ hasText: updatedName }),
    ).toBeVisible();

    // Delete
    const updatedRow = page
      .getByTestId("bank-accounts-row")
      .filter({ hasText: updatedName });
    await updatedRow.getByTestId("bank-accounts-row-delete").click();

    // Assert removed
    await expect(
      page.getByTestId("bank-accounts-row").filter({ hasText: updatedName }),
    ).not.toBeVisible();
  });
});
