import { db } from "./client";
import type {
  MonthlyTotalsRow,
  YearlyTotalsRow,
  MonthlyCategoryTotalsRow,
  YearlyCategoryTotalsRow,
  MonthlyTaggedTypeTotalsRow,
  YearlyTaggedTypeTotalsRow,
  TaggedTypeTotalsRow,
  Transaction,
  ListTransactionsParams,
  TransactionType,
  Category,
  BankAccount,
  Tag,
} from "./types";

// Helper to order by when needed
const order = <T>(query: any, column: string, ascending: boolean) =>
  query.order(column, { ascending });

export const DataApi = {
  // Tables
  async listCategories(type?: TransactionType): Promise<Category[]> {
    // Read from categories_with_usage to get in_use_count
    let q = db
      .from("categories_with_usage")
      .select("id,user_id,type,name,description,created_at,updated_at,in_use_count")
      .order("name", { ascending: true });
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) throw error;
    return (data as any[]) as Category[];
  },

  // Bank Accounts CRUD
  async listBankAccounts(): Promise<BankAccount[]> {
    const { data, error } = await db
      .from("bank_accounts_with_usage")
      .select("id,user_id,name,description,created_at,updated_at,in_use_count")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any[]) as BankAccount[];
  },

  async createBankAccount(input: { name: string; description?: string | null }): Promise<BankAccount> {
    const payload = { name: input.name, description: input.description ?? null };
    const { data, error } = await db.from("bank_accounts").insert(payload).select("*").single();
    if (error) throw error;
    return data as BankAccount;
  },

  async updateBankAccount(id: string, input: Partial<{ name: string; description: string | null }>): Promise<BankAccount> {
    const { data, error } = await db
      .from("bank_accounts")
      .update({ ...input })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as BankAccount;
  },

  async deleteBankAccount(id: string): Promise<void> {
    const { data, error } = await db.rpc("delete_bank_account_safe", { p_bank_account_id: id });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; in_use_count: number } | null;
    if (row && row.ok === false) {
      throw new Error(`Bank account is in use by ${row.in_use_count} transaction(s)`);
    }
  },

  async createCategory(input: { type: TransactionType; name: string; description?: string | null }): Promise<Category> {
    const payload = {
      type: input.type,
      name: input.name,
      description: input.description ?? null,
    };
    const { data, error } = await db.from("categories").insert(payload).select("*").single();
    if (error) throw error;
    return data as Category;
  },

  // Tags CRUD
  async listTags(): Promise<Tag[]> {
    const { data, error } = await db
      .from("tags_with_usage")
      .select("id,user_id,name,description,created_at,updated_at,in_use_count")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any[]) as Tag[];
  },

  async createTag(input: { name: string; description?: string | null }): Promise<Tag> {
    const payload = { name: input.name, description: input.description ?? null };
    const { data, error } = await db.from("tags").insert(payload).select("*").single();
    if (error) throw error;
    return data as Tag;
  },

  async updateTag(id: string, input: Partial<{ name: string; description: string | null }>): Promise<Tag> {
    const { data, error } = await db
      .from("tags")
      .update({ ...input })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async deleteTag(id: string): Promise<void> {
    const { data, error } = await db.rpc("delete_tag_safe", { p_tag_id: id });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; in_use_count: number } | null;
    if (row && row.ok === false) {
      throw new Error(`Tag is in use by ${row.in_use_count} transaction(s)`);
    }
  },

  async updateCategory(id: string, input: Partial<{ name: string; description: string | null }>): Promise<Category> {
    const { data, error } = await db
      .from("categories")
      .update({ ...input })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    // Prefer RPC to avoid raw FK violations and get an actionable result
    const { data, error } = await db.rpc("delete_category_safe", { p_category_id: id });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; in_use_count: number } | null;
    if (row && row.ok === false) {
      throw new Error(`Category is in use by ${row.in_use_count} transaction(s)`);
    }
  },

  async listTransactions(params: ListTransactionsParams = {}): Promise<Transaction[]> {
    let q = db.from("transactions").select("*");

    if (params.from) q = q.gte("date", params.from);
    if (params.to) q = q.lte("date", params.to);
  if (params.type) q = q.eq("type", params.type);
  // Filter by authoritative FK only
  if (params.categoryId) q = q.eq("category_id", params.categoryId);
  if (params.bankAccountId) q = q.eq("bank_account_id", params.bankAccountId);
    if (params.bank_account) q = q.eq("bank_account", params.bank_account);
    if (params.tagsAny?.length) q = q.overlaps("tags", params.tagsAny);
    if (params.tagsAll?.length) q = q.contains("tags", params.tagsAll);

    if (params.orderBy) q = order(q, params.orderBy, params.orderDir !== "desc");
    if (params.limit) q = q.limit(params.limit);
    if (params.offset) q = q.range(params.offset, (params.offset ?? 0) + (params.limit ?? 20) - 1);

    const { data, error } = await q;
    if (error) throw error;
    return data as Transaction[];
  },

  async createSpend(input: {
    date: string; // YYYY-MM-DD
    category?: string | null;
    categoryId?: string | null;
  bank_account_id?: string | null;
    amount: number;
    tags?: string[] | null;
    notes?: string | null;
    bank_account?: string | null;
  }): Promise<Transaction> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const payload = {
      user_id: userId,
      date: input.date,
      type: "spend" as TransactionType,
      category: input.category ?? null,
      category_id: input.categoryId ?? null,
  bank_account_id: input.bank_account_id ?? null,
      amount: input.amount,
      tags: input.tags ?? null,
      notes: input.notes ?? null,
      bank_account: input.bank_account ?? null,
    };

    const { data, error } = await db
      .from("transactions")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as Transaction;
  },

  async createEarn(input: {
    date: string; // YYYY-MM-DD
    category?: string | null;
    categoryId?: string | null;
  bank_account_id?: string | null;
    amount: number;
    tags?: string[] | null;
    notes?: string | null;
    bank_account?: string | null;
  }): Promise<Transaction> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const payload = {
      user_id: userId,
      date: input.date,
      type: "earn" as TransactionType,
      category: input.category ?? null,
      category_id: input.categoryId ?? null,
  bank_account_id: input.bank_account_id ?? null,
      amount: input.amount,
      tags: input.tags ?? null,
      notes: input.notes ?? null,
      bank_account: input.bank_account ?? null,
    };

    const { data, error } = await db
      .from("transactions")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as Transaction;
  },

  async createSave(input: {
    date: string; // YYYY-MM-DD
    category?: string | null;
    categoryId?: string | null;
  bank_account_id?: string | null;
    amount: number;
    tags?: string[] | null;
    notes?: string | null;
    bank_account?: string | null;
  }): Promise<Transaction> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const payload = {
      user_id: userId,
      date: input.date,
      type: "save" as TransactionType,
      category: input.category ?? null,
      category_id: input.categoryId ?? null,
  bank_account_id: input.bank_account_id ?? null,
      amount: input.amount,
      tags: input.tags ?? null,
      notes: input.notes ?? null,
      bank_account: input.bank_account ?? null,
    };

    const { data, error } = await db
      .from("transactions")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as Transaction;
  },

  async updateTransaction(id: string, changes: Partial<Pick<Transaction, "date" | "category" | "category_id" | "bank_account_id" | "amount" | "tags" | "notes" | "bank_account" | "type">>): Promise<Transaction> {
    const { data, error } = await db
      .from("transactions")
      .update(changes)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Transaction;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await db.from("transactions").delete().eq("id", id);
    if (error) throw error;
  },

  async deleteTransactions(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await db.from("transactions").delete().in("id", ids);
    if (error) throw error;
  },

  async sumTransactionsAmount(params: ListTransactionsParams = {}): Promise<number> {
    const { data, error } = await db.rpc("sum_transactions_amount", {
      p_from: params.from ?? null,
      p_to: params.to ?? null,
      p_type: (params.type as any) ?? null,
      p_category_id: params.categoryId ?? null,
      p_bank_account: params.bank_account ?? null,
      p_tags_any: params.tagsAny ?? null,
      p_tags_all: params.tagsAll ?? null,
    });
    if (error) throw error;
    return (data as unknown as number) ?? 0;
  },

  // Views: totals by month/type
  async monthlyTotals(month?: string): Promise<MonthlyTotalsRow[]> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");
    let q = db.from("view_monthly_totals").select("*").eq("user_id", userId);
    if (month) q = q.eq("month", month);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyTotalsRow[];
  },

  async yearlyTotals(year?: string): Promise<YearlyTotalsRow[]> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");
    let q = db.from("view_yearly_totals").select("*").eq("user_id", userId);
    if (year) q = q.eq("year", year);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyTotalsRow[];
  },

  async monthlyCategoryTotals(month?: string): Promise<MonthlyCategoryTotalsRow[]> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");
    let q = db.from("view_monthly_category_totals").select("*").eq("user_id", userId);
    if (month) q = q.eq("month", month);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyCategoryTotalsRow[];
  },

  async yearlyCategoryTotals(year?: string): Promise<YearlyCategoryTotalsRow[]> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");
    let q = db.from("view_yearly_category_totals").select("*").eq("user_id", userId);
    if (year) q = q.eq("year", year);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyCategoryTotalsRow[];
  },

  async monthlyTaggedTypeTotals(month?: string, tagsAny?: string[]): Promise<MonthlyTaggedTypeTotalsRow[]> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");
    let q = db.from("view_monthly_tagged_type_totals").select("*").eq("user_id", userId);
    if (month) q = q.eq("month", month);
    if (tagsAny?.length) q = q.overlaps("tags", tagsAny);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyTaggedTypeTotalsRow[];
  },

  async yearlyTaggedTypeTotals(year?: string, tagsAny?: string[]): Promise<YearlyTaggedTypeTotalsRow[]> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");
    let q = db.from("view_yearly_tagged_type_totals").select("*").eq("user_id", userId);
    if (year) q = q.eq("year", year);
    if (tagsAny?.length) q = q.overlaps("tags", tagsAny);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyTaggedTypeTotalsRow[];
  },

  async taggedTypeTotals(tagsAny?: string[]): Promise<TaggedTypeTotalsRow[]> {
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");
    let q = db.from("view_tagged_type_totals").select("*").eq("user_id", userId);
    if (tagsAny?.length) q = q.overlaps("tags", tagsAny);
    const { data, error } = await q;
    if (error) throw error;
    return data as TaggedTypeTotalsRow[];
  },

  // Convenience: current month/year helpers
  async currentMonthCategoryTotals(): Promise<MonthlyCategoryTotalsRow[]> {
    const firstDay = new Date();
    firstDay.setDate(1);
    const month = firstDay.toISOString().slice(0, 10); // YYYY-MM-01
    return this.monthlyCategoryTotals(month);
  },

  async currentYearCategoryTotals(): Promise<YearlyCategoryTotalsRow[]> {
    const d = new Date();
    const year = `${d.getFullYear()}-01-01`;
    return this.yearlyCategoryTotals(year);
  },
};
