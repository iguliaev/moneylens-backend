import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  cleanupReferenceDataForUser,
} from "../utils/test-helpers";

test.describe("Settings: Tags CRUD", () => {
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
    await page.goto("/settings/tags");
  });

  test("user can create/update/delete tags", async ({ page }) => {
    const ts = Date.now();
    const name = `e2e-tag-${ts}`;
    const desc = `e2e-tag-desc-${ts}`;
    const updatedName = `${name}-updated`;
    const updatedDesc = `${desc}-updated`;

    // Create
    await page.getByTestId("tags-create-name").fill(name);
    await page.getByTestId("tags-create-description").fill(desc);
    await page.getByTestId("tags-create-submit").click();

    // Assert row appears
    const row = page.getByTestId("tags-row").filter({ hasText: name });
    await expect(row).toBeVisible();

    // Update
    await row.getByTestId("tags-row-edit").click();

    // We clicked on the edit button within the specific row,
    // so we expect the edit fields to be scoped to that row
    await page.getByTestId("tags-row-edit-name").fill(updatedName);
    await page.getByTestId("tags-row-edit-description").fill(updatedDesc);
    await page.getByTestId("tags-row-save").click();

    // Assert updated
    await expect(
      page.getByTestId("tags-row").filter({ hasText: updatedName }),
    ).toBeVisible();

    // Delete
    const updatedRow = page
      .getByTestId("tags-row")
      .filter({ hasText: updatedName });
    await updatedRow.getByTestId("tags-row-delete").click();

    // Assert removed
    await expect(
      page.getByTestId("tags-row").filter({ hasText: updatedName }),
    ).not.toBeVisible();
  });
});
