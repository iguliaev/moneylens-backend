import { test, expect, Page } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  cleanupTransactionsForUser,
  cleanupReferenceDataForUser,
  createBankAccount,
  createTag,
  createCategoryForType,
  selectTags,
} from "../utils/test-helpers";

test.describe("Transactions: CRUD with Settings-created assignments", () => {
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

  test.afterEach(async () => {
    await cleanupTransactionsForUser(testUser.userId);
  });

  test("user can create/update/delete a spend transaction with assignments", async ({
    page,
  }) => {
    const ts = Date.now();
    const spendCategoryName = `e2e-spend-cat-${ts}`;
    const bankAccountName = `e2e-ba-${ts}`;
    const tagA = `e2e-tag-a-${ts}`;
    const tagB = `e2e-tag-b-${ts}`;

    // 1) Create reference data via Settings UI
    await createCategoryForType(page, "spend", spendCategoryName);
    await createBankAccount(page, bankAccountName);
    await createTag(page, tagA);
    await createTag(page, tagB);

    // 2) Create transaction with assignments
    await page.goto("/spend");

    await page.getByTestId("spend-form-amount").fill("12.34");
    await page.getByTestId("spend-form-date").fill("2025-12-20");
    await page
      .getByTestId("spend-form-notes")
      .fill("e2e spend with assignments");

    await page
      .getByTestId("spend-form-category")
      .selectOption({ label: spendCategoryName });

    await page
      .getByTestId("spend-form-bank-account")
      .selectOption({ label: bankAccountName });

    await selectTags(page, "spend-form-tags", [tagA, tagB]);

    await page.getByTestId("spend-add-transaction").click();

    // 3) Assert row contains assignments (no totals assertions)
    const notesCell = page
      .getByTestId("spend-row-notes")
      .filter({ hasText: "e2e spend with assignments" });
    await expect(notesCell).toBeVisible();

    await expect(
      page
        .getByTestId("spend-row-bank-account")
        .filter({ hasText: bankAccountName }),
    ).toBeVisible();

    await expect(
      page.getByTestId("spend-row-tags").filter({ hasText: tagA }),
    ).toBeVisible();

    await expect(
      page.getByTestId("spend-row-tags").filter({ hasText: tagB }),
    ).toBeVisible();

    // 4) Update transaction (re-assert assignments persist)
    await page.getByTestId("spend-start-edit").first().click();
    await page.getByTestId("spend-edit-notes").fill("e2e updated notes");
    await page.getByTestId("spend-save-edit").click();

    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "e2e updated notes" }),
    ).toBeVisible();

    await expect(
      page
        .getByTestId("spend-row-bank-account")
        .filter({ hasText: bankAccountName }),
    ).toBeVisible();

    await expect(
      page.getByTestId("spend-row-tags").filter({ hasText: tagA }),
    ).toBeVisible();

    await expect(
      page.getByTestId("spend-row-tags").filter({ hasText: tagB }),
    ).toBeVisible();

    // 5) Delete transaction
    await page.getByTestId("spend-delete-transaction").first().click();

    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "e2e updated notes" }),
    ).not.toBeVisible();
  });

  test("user can create earn transaction with assignments", async ({
    page,
  }) => {
    const ts = Date.now();
    const earnCategoryName = `e2e-earn-cat-${ts}`;
    const bankAccountName = `e2e-ba-earn-${ts}`;
    const tagA = `e2e-tag-earn-a-${ts}`;
    const tagB = `e2e-tag-earn-b-${ts}`;

    await createCategoryForType(page, "earn", earnCategoryName);
    await createBankAccount(page, bankAccountName);
    await createTag(page, tagA);
    await createTag(page, tagB);

    await page.goto("/earn");

    await page.getByTestId("earn-form-amount").fill("500.00");
    await page.getByTestId("earn-form-date").fill("2025-12-20");
    await page.getByTestId("earn-form-notes").fill("e2e earn with assignments");

    await page
      .getByTestId("earn-form-category")
      .selectOption({ label: earnCategoryName });

    await page
      .getByTestId("earn-form-bank-account")
      .selectOption({ label: bankAccountName });

    await selectTags(page, "earn-form-tags", [tagA, tagB]);

    await page.getByTestId("earn-add-transaction").click();

    // Assert assignments
    await expect(
      page
        .getByTestId("earn-row-bank-account")
        .filter({ hasText: bankAccountName }),
    ).toBeVisible();

    await expect(
      page.getByTestId("earn-row-tags").filter({ hasText: tagA }),
    ).toBeVisible();

    await expect(
      page.getByTestId("earn-row-tags").filter({ hasText: tagB }),
    ).toBeVisible();
  });

  test("user can create save transaction with assignments", async ({
    page,
  }) => {
    const ts = Date.now();
    const saveCategoryName = `e2e-save-cat-${ts}`;
    const bankAccountName = `e2e-ba-save-${ts}`;
    const tagA = `e2e-tag-save-a-${ts}`;
    const tagB = `e2e-tag-save-b-${ts}`;

    await createCategoryForType(page, "save", saveCategoryName);
    await createBankAccount(page, bankAccountName);
    await createTag(page, tagA);
    await createTag(page, tagB);

    await page.goto("/save");

    await page.getByTestId("save-form-amount").fill("200.00");
    await page.getByTestId("save-form-date").fill("2025-12-20");
    await page.getByTestId("save-form-notes").fill("e2e save with assignments");

    await page
      .getByTestId("save-form-category")
      .selectOption({ label: saveCategoryName });

    await page
      .getByTestId("save-form-bank-account")
      .selectOption({ label: bankAccountName });

    await selectTags(page, "save-form-tags", [tagA, tagB]);

    await page.getByTestId("save-add-transaction").click();

    // Assert assignments
    await expect(
      page
        .getByTestId("save-row-bank-account")
        .filter({ hasText: bankAccountName }),
    ).toBeVisible();

    await expect(
      page.getByTestId("save-row-tags").filter({ hasText: tagA }),
    ).toBeVisible();

    await expect(
      page.getByTestId("save-row-tags").filter({ hasText: tagB }),
    ).toBeVisible();
  });
});
