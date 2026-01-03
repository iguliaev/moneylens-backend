import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  loginUser,
  seedReferenceDataForUser,
  cleanupReferenceDataForUser,
  supabaseAdmin,
  logoutUser,
} from "../utils/test-helpers";

test.describe("Data Reset Isolation", () => {
  let userA: { email: string; password: string; userId: string };
  let userB: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    // Create two test users sequentially (parallel creation can cause DB race conditions)
    userA = await createTestUser("userA");
    userB = await createTestUser("userB");
  });

  test.afterAll(async () => {
    // Best-effort cleanup - skip userA since their data was reset
    if (userB?.userId) await cleanupReferenceDataForUser(userB.userId);
    if (userA?.userId) await deleteTestUser(userA.userId);
    if (userB?.userId) await deleteTestUser(userB.userId);
  });

  test("resetting User A's data does not affect User B's data", async ({
    page,
  }) => {
    // Seed data for both users
    await seedReferenceDataForUser(userA.userId);
    await seedReferenceDataForUser(userB.userId);

    // Add transactions for both users
    const now = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const { data: userACats } = await supabaseAdmin
      .from("categories")
      .select("id, type")
      .eq("user_id", userA.userId);
    const { data: userBCats } = await supabaseAdmin
      .from("categories")
      .select("id, type")
      .eq("user_id", userB.userId);

    const spendCatA = userACats?.find((c: any) => c.type === "spend");
    const spendCatB = userBCats?.find((c: any) => c.type === "spend");

    const { error: txnError } = await supabaseAdmin.from("transactions").insert([
      {
        user_id: userA.userId,
        date: today,
        type: "spend",
        amount: 100.0,
        category: "Groceries",
        category_id: spendCatA?.id,
        notes: "UserA transaction to be reset",
        created_at: now,
        updated_at: now,
      },
      {
        user_id: userB.userId,
        date: today,
        type: "spend",
        amount: 200.0,
        category: "Groceries",
        category_id: spendCatB?.id,
        notes: "UserB transaction should persist",
        created_at: now,
        updated_at: now,
      },
    ]);
    if (txnError) throw new Error(`Failed to insert transactions: ${txnError.message}`);

    // User A resets their data
    await loginUser(page, userA.email, userA.password);
    await page.goto("/settings");
    await page.getByTestId("settings-reset-data-button").click();
    await page.getByTestId("data-reset-confirm-input").fill("DELETE");
    await page.getByTestId("data-reset-confirm").click();
    await expect(page.getByTestId("data-reset-success")).toBeVisible({
      timeout: 15000,
    });

    // Verify User A's data is gone
    await page.goto("/spend");
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "UserA transaction to be reset" }),
    ).not.toBeVisible();

    await page.goto("/settings/categories");
    await page.getByTestId("categories-type-spend").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "Groceries" }),
    ).not.toBeVisible();

    // Logout User A
    await logoutUser(page);

    // Now login as User B and verify their data is intact
    await loginUser(page, userB.email, userB.password);

    // User B's transaction should still exist
    await page.goto("/spend");
    await expect(
      page
        .getByTestId("spend-row-notes")
        .filter({ hasText: "UserB transaction should persist" }),
    ).toBeVisible();

    // User B's categories should still exist
    await page.goto("/settings/categories");
    await page.getByTestId("categories-type-spend").click();
    await expect(
      page.getByTestId("categories-row").filter({ hasText: "Groceries" }),
    ).toBeVisible();

    // User B's bank accounts should still exist
    await page.goto("/settings/bank-accounts");
    await expect(
      page.getByTestId("bank-accounts-row").filter({ hasText: "Main Account" }),
    ).toBeVisible();

    // User B's tags should still exist
    await page.goto("/settings/tags");
    await expect(
      page.getByTestId("tags-row").filter({ hasText: "essentials" }),
    ).toBeVisible();
  });
});
