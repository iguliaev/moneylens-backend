import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  cleanupReferenceDataForUser,
  logoutUser,
  e2eCurrentMonthDate,
} from "../utils/test-helpers";
import * as path from "path";
import * as fs from "fs";
import { Buffer } from "buffer";

test.describe("Bulk Upload Data Isolation", () => {
  let userA: { email: string; password: string; userId: string };
  let userB: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    // Create two test users sequentially (parallel creation can cause DB race conditions)
    userA = await createTestUser("userA");
    userB = await createTestUser("userB");
  });

  test.afterAll(async () => {
    // Guard against cleanup if beforeAll failed
    if (userA?.userId) await cleanupReferenceDataForUser(userA.userId);
    if (userB?.userId) await cleanupReferenceDataForUser(userB.userId);
    if (userA?.userId) await deleteTestUser(userA.userId);
    if (userB?.userId) await deleteTestUser(userB.userId);
  });

  test("data uploaded by User A is not visible to User B", async ({ page }) => {
    // User A uploads data
    await loginUser(page, userA.email, userA.password);
    await page.goto("/settings");

    const date = e2eCurrentMonthDate();
    const fixturePath = path.join(__dirname, "../fixtures/valid-bulk-upload.json");
    const fixtureJson = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    if (Array.isArray(fixtureJson.transactions)) {
      fixtureJson.transactions = fixtureJson.transactions.map((t: any) => ({
        ...t,
        date,
      }));
    }
    const buffer = Buffer.from(JSON.stringify(fixtureJson), "utf8");

    await page.getByTestId("bulk-upload-input").setInputFiles({
      name: "valid-bulk-upload.json",
      mimeType: "application/json",
      buffer,
    });
    await expect(page.getByTestId("bulk-upload-preview")).toBeVisible();
    await page.getByTestId("bulk-upload-submit").click();
    await expect(page.getByTestId("bulk-upload-success")).toBeVisible();

    // Verify User A can see the uploaded data
    await page.goto("/settings/categories");
    await page.getByTestId("categories-type-spend").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "e2e-spend-cat" }),
    ).toBeVisible();

    await page.goto("/spend");
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "E2E spend transaction" }),
    ).toBeVisible();

    // Logout User A
    await logoutUser(page);

    // Now login as User B
    await loginUser(page, userB.email, userB.password);

    // Verify User B cannot see User A's uploaded categories
    await page.goto("/settings/categories");
    await page.getByTestId("categories-type-spend").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "e2e-spend-cat" }),
    ).not.toBeVisible();

    // Verify User B cannot see User A's uploaded transactions
    await page.goto("/spend");
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "E2E spend transaction" }),
    ).not.toBeVisible();

    // Verify User B cannot see User A's uploaded bank accounts
    await page.goto("/settings/bank-accounts");
    await expect(
      page
        .getByTestId("bank-accounts-row")
        .filter({ hasText: "e2e-bank-account" }),
    ).not.toBeVisible();

    // Verify User B cannot see User A's uploaded tags
    await page.goto("/settings/tags");
    await expect(
      page.getByTestId("tags-row").filter({ hasText: "e2e-tag-1" }),
    ).not.toBeVisible();
  });
});
