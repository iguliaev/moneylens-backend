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
    if (params.tagsAny?.length) q = q.contains("tags", params.tagsAny);
    if (params.tagsAll?.length) q = q.contains("tags", params.tagsAll);

    if (params.orderBy) q = order(q, params.orderBy, params.orderDir !== "desc");
    if (params.limit) q = q.limit(params.limit);
    if (params.offset) q = q.range(params.offset, (params.offset ?? 0) + (params.limit ?? 20) - 1);

    const { data, error } = await q;
    if (error) throw error;
    return data as Transaction[];
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
