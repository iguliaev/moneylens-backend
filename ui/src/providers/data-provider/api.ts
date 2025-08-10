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
} from "./types";

// Helper to order by when needed
const order = <T>(query: any, column: string, ascending: boolean) =>
  query.order(column, { ascending });

export const DataApi = {
  // Tables
  async listTransactions(params: ListTransactionsParams = {}): Promise<Transaction[]> {
    let q = db.from("transactions").select("*");

    if (params.from) q = q.gte("date", params.from);
    if (params.to) q = q.lte("date", params.to);
    if (params.type) q = q.eq("type", params.type);
    if (params.category) q = q.eq("category", params.category);
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

  async updateTransaction(id: string, changes: Partial<Pick<Transaction, "date" | "category" | "amount" | "tags" | "notes" | "bank_account" | "type">>): Promise<Transaction> {
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
      p_category: params.category ?? null,
      p_bank_account: params.bank_account ?? null,
      p_tags_any: params.tagsAny ?? null,
      p_tags_all: params.tagsAll ?? null,
    });
    if (error) throw error;
    // Supabase returns scalar as data directly (number)
    return (data as unknown as number) ?? 0;
  },

  // Views: totals by month/type
  async monthlyTotals(month?: string): Promise<MonthlyTotalsRow[]> {
    let q = db.from("view_monthly_totals").select("*");
    if (month) q = q.eq("month", month);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyTotalsRow[];
  },

  async yearlyTotals(year?: string): Promise<YearlyTotalsRow[]> {
    let q = db.from("view_yearly_totals").select("*");
    if (year) q = q.eq("year", year);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyTotalsRow[];
  },

  async monthlyCategoryTotals(month?: string): Promise<MonthlyCategoryTotalsRow[]> {
    let q = db.from("view_monthly_category_totals").select("*");
    if (month) q = q.eq("month", month);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyCategoryTotalsRow[];
  },

  async yearlyCategoryTotals(year?: string): Promise<YearlyCategoryTotalsRow[]> {
    let q = db.from("view_yearly_category_totals").select("*");
    if (year) q = q.eq("year", year);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyCategoryTotalsRow[];
  },

  async monthlyTaggedTypeTotals(month?: string, tagsAny?: string[]): Promise<MonthlyTaggedTypeTotalsRow[]> {
    let q = db.from("view_monthly_tagged_type_totals").select("*");
    if (month) q = q.eq("month", month);
    if (tagsAny?.length) q = q.overlaps("tags", tagsAny);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyTaggedTypeTotalsRow[];
  },

  async yearlyTaggedTypeTotals(year?: string, tagsAny?: string[]): Promise<YearlyTaggedTypeTotalsRow[]> {
    let q = db.from("view_yearly_tagged_type_totals").select("*");
    if (year) q = q.eq("year", year);
    if (tagsAny?.length) q = q.overlaps("tags", tagsAny);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyTaggedTypeTotalsRow[];
  },

  async taggedTypeTotals(tagsAny?: string[]): Promise<TaggedTypeTotalsRow[]> {
    let q = db.from("view_tagged_type_totals").select("*");
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
