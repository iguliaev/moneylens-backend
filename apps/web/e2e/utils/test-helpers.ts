import { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { expect } from "@playwright/test";
import type { Database, TablesInsert } from "./backend-types";
import { slugify } from "../../src/utils/slugify";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for test setup/teardown
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } },
);

export async function createTestUser(seed?: string) {
  const email = seed
    ? `test-${seed}-${Date.now()}@example.com`
    : `test-${Date.now()}@example.com`;
  const password = "TestPassword123!";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("Failed to create test user:", error.message, error);
    throw error;
  }
  // `data.user` structure comes from supabase-js response shape
  return { email, password, userId: (data as any).user.id };
}

export async function deleteTestUser(userId: string) {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('input[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 10000 });
}

export async function logoutUser(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL("/login", { timeout: 5000 });
}

// Seed minimal reference data (categories, bank accounts, tags) for a given user
export async function seedReferenceDataForUser(userId: string) {
  const now = new Date().toISOString();

  // Categories for each type
  const categories: TablesInsert<"categories">[] = [
    {
      user_id: userId,
      type: "spend",
      name: "Groceries",
      description: "Groceries",
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      type: "earn",
      name: "Salary",
      description: "Salary",
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      type: "save",
      name: "Savings",
      description: "Savings",
      created_at: now,
      updated_at: now,
    },
  ];
  const { error: categoriesError } = await supabaseAdmin
    .from("categories")
    .upsert(categories, { onConflict: "user_id,type,name" });
  if (categoriesError)
    throw new Error(`Failed to seed categories: ${categoriesError.message}`);

  // One bank account
  const bankAccounts: TablesInsert<"bank_accounts">[] = [
    {
      user_id: userId,
      name: "Main Account",
      description: "Primary bank account",
      created_at: now,
      updated_at: now,
    },
  ];
  const { error: bankAccountsError } = await supabaseAdmin
    .from("bank_accounts")
    .upsert(bankAccounts, { onConflict: "user_id,name" });
  if (bankAccountsError)
    throw new Error(
      `Failed to seed bank accounts: ${bankAccountsError.message}`,
    );

  // A couple of tags
  const tags: TablesInsert<"tags">[] = [
    {
      user_id: userId,
      name: "essentials",
      description: "Essential expenses",
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      name: "monthly",
      description: "Monthly items",
      created_at: now,
      updated_at: now,
    },
  ];
  const { error: tagsError } = await supabaseAdmin
    .from("tags")
    .upsert(tags, { onConflict: "user_id,name" });
  if (tagsError) throw new Error(`Failed to seed tags: ${tagsError.message}`);
}

// Cleanup reference data that was seeded or created for a given user
export async function cleanupReferenceDataForUser(userId: string) {
  // Delete in order to avoid foreign key constraint violations:
  // 1. transactions first (cascades to transaction_tags)
  // 2. Then reference data (tags, bank accounts, categories)

  try {
    await supabaseAdmin.from("transactions").delete().eq("user_id", userId);
  } catch {
    // noop
  }

  try {
    await supabaseAdmin.from("tags").delete().eq("user_id", userId);
  } catch {
    // noop
  }

  try {
    await supabaseAdmin.from("bank_accounts").delete().eq("user_id", userId);
  } catch {
    // noop
  }

  try {
    await supabaseAdmin.from("categories").delete().eq("user_id", userId);
  } catch {
    // noop
  }
}

// Delete all transactions for a given user
export async function cleanupTransactionsForUser(userId: string) {
  try {
    await supabaseAdmin.from("transactions").delete().eq("user_id", userId);
  } catch {
    // noop
  }
}

// Helper to create a bank account via Settings UI
export async function createBankAccount(page: Page, name: string) {
  await page.goto("/settings/bank-accounts");
  await page.getByTestId("bank-accounts-create-name").fill(name);
  await page.getByTestId("bank-accounts-create-description").fill("e2e");
  await page.getByTestId("bank-accounts-create-submit").click();
  await expect(
    page.getByTestId("bank-accounts-row").filter({ hasText: name }),
  ).toBeVisible();
}

// Helper to create a tag via Settings UI
export async function createTag(page: Page, name: string) {
  await page.goto("/settings/tags");
  await page.getByTestId("tags-create-name").fill(name);
  await page.getByTestId("tags-create-description").fill("e2e");
  await page.getByTestId("tags-create-submit").click();
  await expect(
    page.getByTestId("tags-row").filter({ hasText: name }),
  ).toBeVisible();
}

// Helper to create a category for a given type via Settings UI
export async function createCategoryForType(
  page: Page,
  type: string,
  name: string,
) {
  await page.goto("/settings/categories");
  await page.getByTestId(`categories-type-${type}`).click();
  await page.getByTestId("categories-create-name").fill(name);
  await page.getByTestId("categories-create-description").fill("e2e");
  await page.getByTestId("categories-create-submit").click();
  await expect(
    page.getByTestId("categories-row").filter({ hasText: name }),
  ).toBeVisible();
}

// Helper to select multiple tags via MultiSelect dropdown
export async function selectTags(
  page: Page,
  testId: string,
  tagNames: string[],
) {
  // Open dropdown
  await page.getByTestId(`${testId}-button`).click();

  // Select each tag
  for (const tagName of tagNames) {
    const slug = slugify(tagName);
    const option = page.getByTestId(`${testId}-option-${slug}`);
    await expect(option).toBeVisible();
    await option.click();
  }

  // Close dropdown
  await page.keyboard.press("Escape");
}

// Seed transactions for a user with specific identifiable data
export async function seedTransactionsForUser(
  userId: string,
  prefix: string, // e.g., "userA" or "userB" to make data identifiable
) {
  const now = new Date().toISOString();

  // Get category IDs for the user
  const { data: categories, error: catQueryError } = await supabaseAdmin
    .from("categories")
    .select("id, type, name")
    .eq("user_id", userId);

  if (catQueryError) {
    console.error(`Failed to query categories for ${prefix}:`, catQueryError);
  }

  // Get tag IDs for the user (to associate with transactions for Top Tags panel)
  const { data: tags, error: tagQueryError } = await supabaseAdmin
    .from("tags")
    .select("id, name")
    .eq("user_id", userId);

  if (tagQueryError) {
    console.error(`Failed to query tags for ${prefix}:`, tagQueryError);
  }

  const spendCat = categories?.find((c) => c.type === "spend");
  const earnCat = categories?.find((c) => c.type === "earn");
  const saveCat = categories?.find((c) => c.type === "save");
  const tag1 = tags?.find((t) => t.name === `${prefix}-tag1`);

  const transactions = [
    {
      user_id: userId,
      date: new Date().toISOString().slice(0, 10), // Current month for dashboard visibility
      type: "spend" as const,
      amount: 100.0,
      category: spendCat?.name || "Groceries",
      category_id: spendCat?.id,
      notes: `${prefix}-spend-transaction`,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      type: "earn" as const,
      amount: 500.0,
      category: earnCat?.name || "Salary",
      category_id: earnCat?.id,
      notes: `${prefix}-earn-transaction`,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      type: "save" as const,
      amount: 200.0,
      category: saveCat?.name || "Savings",
      category_id: saveCat?.id,
      notes: `${prefix}-save-transaction`,
      created_at: now,
      updated_at: now,
    },
  ];

  const { data: insertedTxns, error } = await supabaseAdmin
    .from("transactions")
    .insert(transactions)
    .select("id");
  if (error) throw new Error(`Failed to seed transactions: ${error.message}`);

  // Associate tag1 with the first transaction (spend) so it appears in Top Tags panel
  if (insertedTxns && insertedTxns.length > 0 && tag1) {
    const { error: tagError } = await supabaseAdmin
      .from("transaction_tags")
      .insert({ transaction_id: insertedTxns[0].id, tag_id: tag1.id });
    if (tagError) {
      throw new Error(`Failed to associate tags: ${tagError.message}`);
    }
  }
}

// Seed reference data with user-specific prefixes for identification
export async function seedReferenceDataWithPrefix(
  userId: string,
  prefix: string,
) {
  const now = new Date().toISOString();

  const categories: Array<{
    user_id: string;
    type: "spend" | "earn" | "save";
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
  }> = [
    {
      user_id: userId,
      type: "spend",
      name: `${prefix}-Groceries`,
      description: `${prefix} groceries`,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      type: "earn",
      name: `${prefix}-Salary`,
      description: `${prefix} salary`,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      type: "save",
      name: `${prefix}-Savings`,
      description: `${prefix} savings`,
      created_at: now,
      updated_at: now,
    },
  ];
  const { error: catError } = await supabaseAdmin
    .from("categories")
    .upsert(categories, { onConflict: "user_id,type,name" });
  if (catError)
    throw new Error(`Failed to seed categories: ${catError.message}`);

  const bankAccounts = [
    {
      user_id: userId,
      name: `${prefix}-Bank`,
      description: `${prefix} bank account`,
      created_at: now,
      updated_at: now,
    },
  ];
  const { error: baError } = await supabaseAdmin
    .from("bank_accounts")
    .upsert(bankAccounts, { onConflict: "user_id,name" });
  if (baError)
    throw new Error(`Failed to seed bank accounts: ${baError.message}`);

  const tags = [
    {
      user_id: userId,
      name: `${prefix}-tag1`,
      description: `${prefix} tag 1`,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: userId,
      name: `${prefix}-tag2`,
      description: `${prefix} tag 2`,
      created_at: now,
      updated_at: now,
    },
  ];
  const { error: tagError } = await supabaseAdmin
    .from("tags")
    .upsert(tags, { onConflict: "user_id,name" });
  if (tagError) throw new Error(`Failed to seed tags: ${tagError.message}`);
}
