import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  seedReferenceDataForUser,
  cleanupReferenceDataForUser,
  cleanupTransactionsForUser,
} from "../utils/test-helpers";

test.describe("Transactions", () => {
  let testUser: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    // Create a single test user and seed reference data once for all tests
    testUser = await createTestUser();
    await seedReferenceDataForUser(testUser.userId);
  });

  test.afterAll(async () => {
    // Clean up categories / bank accounts / tags seeded for this user
    await cleanupReferenceDataForUser(testUser.userId);
    await deleteTestUser(testUser.userId);
  });

  test.beforeEach(async ({ page }) => {
    // Ensure each test starts from an authenticated session
    await loginUser(page, testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    // Clean up transactions after each test for isolation
    await cleanupTransactionsForUser(testUser.userId);
  });

  test("user can create spend transaction", async ({ page }) => {
    await page.goto("/spend");

    await page.getByTestId("spend-form-amount").fill("50.00");
    await page.getByTestId("spend-form-date").fill("2025-12-20");
    await page.getByTestId("spend-form-notes").fill("Test spend transaction");

    // Select category (adjust selector to match your UI)
    await page
      .getByTestId("spend-form-category")
      .selectOption({ label: "Groceries" });
    await page.getByTestId("spend-add-transaction").click();

    // Verify total spent updated (looser check on formatted value)
    const total = page.getByTestId("spend-total-current-month-value");
    await expect(total).toContainText("50");

    // Verify the new transaction row appears in the table
    const notesCell = page
      .getByTestId("spend-row-notes")
      .filter({ hasText: "Test spend transaction" });
    await expect(notesCell).toBeVisible();

    const amountCell = page
      .getByTestId("spend-row-amount")
      .filter({ hasText: "50.00" });
    await expect(amountCell).toBeVisible();

    const categoryCell = page
      .getByTestId("spend-row-category")
      .filter({ hasText: "Groceries" });
    await expect(categoryCell).toBeVisible();
  });

  test("user can create earn transaction", async ({ page }) => {
    await page.goto("/earn");

    await page.getByTestId("earn-form-amount").fill("1000.00");
    await page.getByTestId("earn-form-date").fill("2025-12-20");
    await page.getByTestId("earn-form-notes").fill("Test salary");

    // Select category
    await page
      .getByTestId("earn-form-category")
      .selectOption({ label: "Salary" });
    await page.getByTestId("earn-add-transaction").click();

    // Verify total earned updated
    const total = page.getByTestId("earn-total-current-month-value");
    await expect(total).toContainText(/1[,]?000/);

    // Verify the new transaction row appears in the table
    const notesCell = page
      .getByTestId("earn-row-notes")
      .filter({ hasText: "Test salary" });
    await expect(notesCell).toBeVisible();

    const amountCell = page
      .getByTestId("earn-row-amount")
      .filter({ hasText: "1,000.00" });
    await expect(amountCell).toBeVisible();

    const categoryCell = page
      .getByTestId("earn-row-category")
      .filter({ hasText: "Salary" });
    await expect(categoryCell).toBeVisible();
  });

  test("user can create save transaction", async ({ page }) => {
    await page.goto("/save");

    await page.getByTestId("save-form-amount").fill("200.00");
    await page.getByTestId("save-form-date").fill("2025-12-20");
    await page.getByTestId("save-form-notes").fill("Emergency fund");

    // Select category
    await page
      .getByTestId("save-form-category")
      .selectOption({ label: "Savings" });
    await page.getByTestId("save-add-transaction").click();

    // Verify total saved updated
    const total = page.getByTestId("save-total-current-month-value");
    await expect(total).toContainText("200");

    // Verify the new transaction row appears in the table
    const notesCell = page
      .getByTestId("save-row-notes")
      .filter({ hasText: "Emergency fund" });
    await expect(notesCell).toBeVisible();

    const amountCell = page
      .getByTestId("save-row-amount")
      .filter({ hasText: "200.00" });
    await expect(amountCell).toBeVisible();

    const categoryCell = page
      .getByTestId("save-row-category")
      .filter({ hasText: "Savings" });
    await expect(categoryCell).toBeVisible();
  });

  test("user can edit spend transaction", async ({ page }) => {
    // First create a transaction
    await page.goto("/spend");

    await page.getByTestId("spend-form-amount").fill("100.00");
    await page.getByTestId("spend-form-date").fill("2025-12-20");
    await page.getByTestId("spend-form-notes").fill("Original transaction");
    await page
      .getByTestId("spend-form-category")
      .selectOption({ label: "Groceries" });
    await page.getByTestId("spend-add-transaction").click();

    // Wait for transaction to appear
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "Original transaction" }),
    ).toBeVisible();

    // Click edit on the first row
    await page.getByTestId("spend-start-edit").first().click();

    // Edit the amount and notes
    await page.getByTestId("spend-edit-amount").fill("150.00");
    await page.getByTestId("spend-edit-notes").fill("Updated transaction");
    await page.getByTestId("spend-save-edit").click();

    // Verify the updated values appear
    await expect(
      page.getByTestId("spend-row-amount").filter({ hasText: "150.00" }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "Updated transaction" }),
    ).toBeVisible();

    // Verify old values don't appear
    await expect(
      page.getByTestId("spend-row-amount").filter({ hasText: "100.00" }),
    ).not.toBeVisible();
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "Original transaction" }),
    ).not.toBeVisible();
  });

  test("user can delete spend transaction", async ({ page }) => {
    await page.goto("/spend");

    await page.getByTestId("spend-form-amount").fill("75.00");
    await page.getByTestId("spend-form-date").fill("2025-12-20");
    await page.getByTestId("spend-form-notes").fill("To be deleted");
    await page
      .getByTestId("spend-form-category")
      .selectOption({ label: "Groceries" });
    await page.getByTestId("spend-add-transaction").click();

    // Wait for transaction to appear
    const notesCell = page
      .getByTestId("spend-row-notes")
      .filter({ hasText: "To be deleted" });
    await expect(notesCell).toBeVisible();
    const amountCell = page
      .getByTestId("spend-row-amount")
      .filter({ hasText: "75.00" });
    await expect(amountCell).toBeVisible();

    // Delete the first transaction
    await page.getByTestId("spend-delete-transaction").first().click();

    // Verify it's gone
    await expect(
      page.getByTestId("spend-row-notes").filter({ hasText: "To be deleted" }),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("spend-row-amount").filter({ hasText: "75.00" }),
    ).not.toBeVisible();
  });

  test("user can edit earn transaction", async ({ page }) => {
    // First create a transaction
    await page.goto("/earn");

    await page.getByTestId("earn-form-amount").fill("500.00");
    await page.getByTestId("earn-form-date").fill("2025-12-20");
    await page.getByTestId("earn-form-notes").fill("Original earn");
    await page
      .getByTestId("earn-form-category")
      .selectOption({ label: "Salary" });
    await page.getByTestId("earn-add-transaction").click();

    // Wait for transaction to appear
    await expect(
      page.getByTestId("earn-row-notes").filter({ hasText: "Original earn" }),
    ).toBeVisible();

    // Click edit on the first row
    await page.getByTestId("earn-start-edit").first().click();

    // Edit the amount and notes
    await page.getByTestId("earn-edit-amount").fill("750.00");
    await page.getByTestId("earn-edit-notes").fill("Updated earn");
    await page.getByTestId("earn-save-edit").click();

    // Verify the updated values appear
    await expect(
      page.getByTestId("earn-row-amount").filter({ hasText: "750.00" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("earn-row-notes").filter({ hasText: "Updated earn" }),
    ).toBeVisible();

    // Verify old values don't appear
    await expect(
      page.getByTestId("earn-row-amount").filter({ hasText: "500.00" }),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("earn-row-notes").filter({ hasText: "Original earn" }),
    ).not.toBeVisible();
  });

  test("user can delete earn transaction", async ({ page }) => {
    await page.goto("/earn");

    await page.getByTestId("earn-form-amount").fill("300.00");
    await page.getByTestId("earn-form-date").fill("2025-12-20");
    await page.getByTestId("earn-form-notes").fill("Earn to be deleted");
    await page
      .getByTestId("earn-form-category")
      .selectOption({ label: "Salary" });
    await page.getByTestId("earn-add-transaction").click();

    // Wait for transaction to appear
    const notesCell = page
      .getByTestId("earn-row-notes")
      .filter({ hasText: "Earn to be deleted" });
    await expect(notesCell).toBeVisible();
    const amountCell = page
      .getByTestId("earn-row-amount")
      .filter({ hasText: "300.00" });
    await expect(amountCell).toBeVisible();

    // Delete the first transaction
    await page.getByTestId("earn-delete-transaction").first().click();

    // Verify it's gone
    await expect(
      page
        .getByTestId("earn-row-notes")
        .filter({ hasText: "Earn to be deleted" }),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("earn-row-amount").filter({ hasText: "300.00" }),
    ).not.toBeVisible();
  });

  test("user can edit save transaction", async ({ page }) => {
    // First create a transaction
    await page.goto("/save");

    await page.getByTestId("save-form-amount").fill("100.00");
    await page.getByTestId("save-form-date").fill("2025-12-20");
    await page.getByTestId("save-form-notes").fill("Original save");
    await page
      .getByTestId("save-form-category")
      .selectOption({ label: "Savings" });
    await page.getByTestId("save-add-transaction").click();

    // Wait for transaction to appear
    await expect(
      page.getByTestId("save-row-notes").filter({ hasText: "Original save" }),
    ).toBeVisible();

    // Click edit on the first row
    await page.getByTestId("save-start-edit").first().click();

    // Edit the amount and notes
    await page.getByTestId("save-edit-amount").fill("250.00");
    await page.getByTestId("save-edit-notes").fill("Updated save");
    await page.getByTestId("save-save-edit").click();

    // Verify the updated values appear
    await expect(
      page.getByTestId("save-row-amount").filter({ hasText: "250.00" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("save-row-notes").filter({ hasText: "Updated save" }),
    ).toBeVisible();

    // Verify old values don't appear
    await expect(
      page.getByTestId("save-row-amount").filter({ hasText: "100.00" }),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("save-row-notes").filter({ hasText: "Original save" }),
    ).not.toBeVisible();
  });

  test("user can delete save transaction", async ({ page }) => {
    await page.goto("/save");

    await page.getByTestId("save-form-amount").fill("150.00");
    await page.getByTestId("save-form-date").fill("2025-12-20");
    await page.getByTestId("save-form-notes").fill("Save to be deleted");
    await page
      .getByTestId("save-form-category")
      .selectOption({ label: "Savings" });
    await page.getByTestId("save-add-transaction").click();

    // Wait for transaction to appear
    const notesCell = page
      .getByTestId("save-row-notes")
      .filter({ hasText: "Save to be deleted" });
    await expect(notesCell).toBeVisible();
    const amountCell = page
      .getByTestId("save-row-amount")
      .filter({ hasText: "150.00" });
    await expect(amountCell).toBeVisible();

    // Delete the first transaction
    await page.getByTestId("save-delete-transaction").first().click();

    // Verify it's gone
    await expect(
      page
        .getByTestId("save-row-notes")
        .filter({ hasText: "Save to be deleted" }),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("save-row-amount").filter({ hasText: "150.00" }),
    ).not.toBeVisible();
  });
});
