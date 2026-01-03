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
  BulkUploadPayload,
  BulkUploadResult,
  BulkUploadError,
  DataResetResult,
} from "./types";

// Typed RPC error wrapper so callers can inspect structured details
export class RpcError extends Error {
  details: BulkUploadError[];
  originalError: unknown;

  constructor(
    message: string,
    details: BulkUploadError[] = [],
    originalError: unknown = null,
  ) {
    super(message);
    this.name = "RpcError";
    this.details = details;
    this.originalError = originalError;
  }
}

// Internal source enum for transaction queries
type TransactionSource =
  | "transactions"
  | "transactions_spend"
  | "transactions_earn"
  | "transactions_save";

// Helper to order by when needed
const order = <T>(query: any, column: string, ascending: boolean) =>
  query.order(column, { ascending });

async function requireUserId(): Promise<string> {
  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const DataApi = {
  // Tables
  async listCategories(type?: TransactionType): Promise<Category[]> {
    const userId = await requireUserId();

    // Read from categories_with_usage to get in_use_count
    let q = db
      .from("categories_with_usage")
      .select(
        "id,user_id,type,name,description,created_at,updated_at,in_use_count",
      )
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) throw error;
    return data as any[] as Category[];
  },

  // Bank Accounts CRUD
  async listBankAccounts(): Promise<BankAccount[]> {
    const userId = await requireUserId();

    const { data, error } = await db
      .from("bank_accounts_with_usage")
      .select("id,user_id,name,description,created_at,updated_at,in_use_count")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (error) throw error;
    return data as any[] as BankAccount[];
  },

  async createBankAccount(input: {
    name: string;
    description?: string | null;
  }): Promise<BankAccount> {
    const payload = {
      name: input.name,
      description: input.description ?? null,
    };
    const { data, error } = await db
      .from("bank_accounts")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as BankAccount;
  },

  async updateBankAccount(
    id: string,
    input: Partial<{ name: string; description: string | null }>,
  ): Promise<BankAccount> {
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
    const { data, error } = await db.rpc("delete_bank_account_safe", {
      p_bank_account_id: id,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as {
      ok: boolean;
      in_use_count: number;
    } | null;
    if (row && row.ok === false) {
      throw new Error(
        `Bank account is in use by ${row.in_use_count} transaction(s)`,
      );
    }
  },

  async createCategory(input: {
    type: TransactionType;
    name: string;
    description?: string | null;
  }): Promise<Category> {
    const payload = {
      type: input.type,
      name: input.name,
      description: input.description ?? null,
    };
    const { data, error } = await db
      .from("categories")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as Category;
  },

  // Tags CRUD
  async listTags(): Promise<Tag[]> {
    const userId = await requireUserId();

    const { data, error } = await db
      .from("tags_with_usage")
      .select("id,user_id,name,description,created_at,updated_at,in_use_count")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (error) throw error;
    return data as any[] as Tag[];
  },

  async createTag(input: {
    name: string;
    description?: string | null;
  }): Promise<Tag> {
    const payload = {
      name: input.name,
      description: input.description ?? null,
    };
    const { data, error } = await db
      .from("tags")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async updateTag(
    id: string,
    input: Partial<{ name: string; description: string | null }>,
  ): Promise<Tag> {
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
    const row = (Array.isArray(data) ? data[0] : data) as {
      ok: boolean;
      in_use_count: number;
    } | null;
    if (row && row.ok === false) {
      throw new Error(`Tag is in use by ${row.in_use_count} transaction(s)`);
    }
  },

  async updateCategory(
    id: string,
    input: Partial<{ name: string; description: string | null }>,
  ): Promise<Category> {
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
    const { data, error } = await db.rpc("delete_category_safe", {
      p_category_id: id,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as {
      ok: boolean;
      in_use_count: number;
    } | null;
    if (row && row.ok === false) {
      throw new Error(
        `Category is in use by ${row.in_use_count} transaction(s)`,
      );
    }
  },

  /**
   * Internal helper: query transactions from a specific source (base table
   * or one of the type-specific views). Applies the common filters,
   * pagination and sorting logic.
   */
  async _listTransactionsFromSource(
    source: TransactionSource,
    params: ListTransactionsParams = {},
  ): Promise<Transaction[]> {
    const userId = await requireUserId();

    // Select nested tag objects via transaction_tags -> tags
    let q = db
      .from(source)
      .select("*, transaction_tags(tag:tags(id, name, description))")
      .eq("user_id", userId);

    if (params.from) q = q.gte("date", params.from);
    if (params.to) q = q.lte("date", params.to);

    // Type filter only applies when querying base table. Views are already
    // pre-filtered by type.
    if (source === "transactions" && params.type) q = q.eq("type", params.type);

    // Filter by authoritative FK only
    if (params.categoryId) q = q.eq("category_id", params.categoryId);
    if (params.bankAccountId) q = q.eq("bank_account_id", params.bankAccountId);
    if (params.bank_account) q = q.eq("bank_account", params.bank_account);

    if (params.tagsAny?.length) q = q.overlaps("tags", params.tagsAny);
    if (params.tagsAll?.length) q = q.contains("tags", params.tagsAll);

    if (params.orderBy)
      q = order(q, params.orderBy, params.orderDir !== "desc");
    if (params.limit) q = q.limit(params.limit);
    if (params.offset)
      q = q.range(
        params.offset,
        (params.offset ?? 0) + (params.limit ?? 20) - 1,
      );

    const { data, error } = await q;
    if (error) throw error;

    // Transform nested transaction_tags into Tag[] on each transaction
    const transformed = (data as any[]).map((t) => {
      const tags = (t.transaction_tags || [])
        .map((tt: any) => tt.tag)
        .filter(Boolean);
      return {
        ...t,
        tags,
      } as Transaction;
    });
    return transformed as Transaction[];
  },

  /**
   * Public method: list transactions. Selects a type-specific view when the
   * `type` parameter is provided (common case for type pages), otherwise
   * falls back to the base `transactions` table for cross-type queries.
   */
  async listTransactions(
    params: ListTransactionsParams = {},
  ): Promise<Transaction[]> {
    let source: TransactionSource = "transactions";

    if (params.type === "spend") source = "transactions_spend";
    else if (params.type === "earn") source = "transactions_earn";
    else if (params.type === "save") source = "transactions_save";

    return this._listTransactionsFromSource(source, params);
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
    const userId = await requireUserId();

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
    const tx = data as Transaction;

    // Create transaction_tags associations if provided
    if (input.tags && input.tags.length) {
      // Determine if tags are objects with id or plain strings
      const first = input.tags[0] as any;
      if (typeof first === "object" && first.id) {
        const associations = (input.tags as any[]).map((tg: any) => ({
          transaction_id: tx.id,
          tag_id: tg.id,
        }));
        await db.from("transaction_tags").insert(associations).select();
      } else {
        // strings - map names to ids for this user
        const names = (input.tags as string[]).filter(Boolean);
        const { data: tagRows } = await db
          .from("tags")
          .select("id,name")
          .in("name", names)
          .eq("user_id", userId);
        if (tagRows && tagRows.length) {
          const associations = tagRows.map((r: any) => ({
            transaction_id: tx.id,
            tag_id: r.id,
          }));
          await db.from("transaction_tags").insert(associations).select();
        }
      }
    }

    return tx as Transaction;
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
    const userId = await requireUserId();

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
    const tx = data as Transaction;

    if (input.tags && input.tags.length) {
      const first = input.tags[0] as any;
      if (typeof first === "object" && first.id) {
        const associations = (input.tags as any[]).map((tg: any) => ({
          transaction_id: tx.id,
          tag_id: tg.id,
        }));
        await db.from("transaction_tags").insert(associations).select();
      } else {
        const names = (input.tags as string[]).filter(Boolean);
        const { data: tagRows } = await db
          .from("tags")
          .select("id,name")
          .in("name", names)
          .eq("user_id", userId);
        if (tagRows && tagRows.length) {
          const associations = tagRows.map((r: any) => ({
            transaction_id: tx.id,
            tag_id: r.id,
          }));
          await db.from("transaction_tags").insert(associations).select();
        }
      }
    }

    return tx as Transaction;
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
    const userId = await requireUserId();

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
    const tx = data as Transaction;

    if (input.tags && input.tags.length) {
      const first = input.tags[0] as any;
      if (typeof first === "object" && first.id) {
        const associations = (input.tags as any[]).map((tg: any) => ({
          transaction_id: tx.id,
          tag_id: tg.id,
        }));
        await db.from("transaction_tags").insert(associations).select();
      } else {
        const names = (input.tags as string[]).filter(Boolean);
        const { data: tagRows } = await db
          .from("tags")
          .select("id,name")
          .in("name", names)
          .eq("user_id", userId);
        if (tagRows && tagRows.length) {
          const associations = tagRows.map((r: any) => ({
            transaction_id: tx.id,
            tag_id: r.id,
          }));
          await db.from("transaction_tags").insert(associations).select();
        }
      }
    }

    return tx as Transaction;
  },

  async updateTransaction(
    id: string,
    changes: Partial<
      Pick<
        Transaction,
        | "date"
        | "category"
        | "category_id"
        | "bank_account_id"
        | "amount"
        | "tags"
        | "notes"
        | "bank_account"
        | "type"
      >
    >,
  ): Promise<Transaction> {
    const userId = await requireUserId();
    // Handle tags separately if provided
    const tagsInput = (changes as any).tags ?? undefined;
    if (tagsInput !== undefined) {
      // Remove tags from changes before updating transaction row
      delete (changes as any).tags;
    }

    const { data, error } = await db
      .from("transactions")
      .update(changes)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const tx = data as Transaction;

    if (tagsInput !== undefined) {
      // Delete existing associations
      await db.from("transaction_tags").delete().eq("transaction_id", id);

      if (Array.isArray(tagsInput) && tagsInput.length > 0) {
        const first = tagsInput[0] as any;
        if (typeof first === "object" && first.id) {
          const associations = (tagsInput as any[]).map((tg: any) => ({
            transaction_id: id,
            tag_id: tg.id,
          }));
          await db.from("transaction_tags").insert(associations).select();
        } else {
          const names = (tagsInput as string[]).filter(Boolean);
          const { data: tagRows } = await db
            .from("tags")
            .select("id,name")
            .in("name", names)
            .eq("user_id", userId);
          if (tagRows && tagRows.length) {
            const associations = tagRows.map((r: any) => ({
              transaction_id: id,
              tag_id: r.id,
            }));
            await db.from("transaction_tags").insert(associations).select();
          }
        }
      }
    }

    // Refresh transaction row to include updated relations
    const { data: refreshed, error: refErr } = await db
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();
    if (refErr) throw refErr;
    return refreshed as Transaction;
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

  async sumTransactionsAmount(
    params: ListTransactionsParams = {},
  ): Promise<number> {
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

  // Bulk upload RPC - Extended version with entity support
  async bulkUploadData(payload: BulkUploadPayload): Promise<BulkUploadResult> {
    const { data, error } = await db.rpc("bulk_upload_data", {
      p_payload: payload as any, // JSONB type
    });
    if (error) {
      // Try to parse structured error details returned in error.details
      let details: BulkUploadError[] = [];
      try {
        if (error.details) {
          details = JSON.parse(error.details);
        }
      } catch (e) {
        // ignore parse errors
      }
      // Throw a typed RpcError so callers can inspect structured details
      throw new RpcError(error.message ?? "RPC error", details, error);
    }
    return data as BulkUploadResult;
  },

  // Legacy bulk upload RPC - Kept for backward compatibility
  async bulkUploadTransactions(
    payload: BulkUploadPayload,
  ): Promise<BulkUploadResult> {
    const { data, error } = await db.rpc("bulk_insert_transactions", {
      p_transactions: payload.transactions,
    });
    if (error) {
      // Try to parse structured error details returned in error.details
      let details: BulkUploadError[] = [];
      try {
        if (error.details) {
          details = JSON.parse(error.details);
        }
      } catch (e) {
        // ignore parse errors
      }
      // Throw a typed RpcError so callers can inspect structured details
      throw new RpcError(error.message ?? "RPC error", details, error);
    }
    return data as BulkUploadResult;
  },

  // Phase 3: Data Reset - Permanently delete all user data
  async resetUserData(): Promise<DataResetResult> {
    const { data, error } = await db.rpc("reset_user_data");
    if (error) {
      throw new Error(error.message ?? "Failed to reset user data");
    }
    return data as DataResetResult;
  },

  // Views: totals by month/type
  async monthlyTotals(month?: string): Promise<MonthlyTotalsRow[]> {
    const userId = await requireUserId();
    let q = db.from("view_monthly_totals").select("*").eq("user_id", userId);
    if (month) q = q.eq("month", month);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyTotalsRow[];
  },

  async yearlyTotals(year?: string): Promise<YearlyTotalsRow[]> {
    const userId = await requireUserId();
    let q = db.from("view_yearly_totals").select("*").eq("user_id", userId);
    if (year) q = q.eq("year", year);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyTotalsRow[];
  },

  async monthlyCategoryTotals(
    month?: string,
  ): Promise<MonthlyCategoryTotalsRow[]> {
    const userId = await requireUserId();
    let q = db
      .from("view_monthly_category_totals")
      .select("*")
      .eq("user_id", userId);
    if (month) q = q.eq("month", month);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyCategoryTotalsRow[];
  },

  async yearlyCategoryTotals(
    year?: string,
  ): Promise<YearlyCategoryTotalsRow[]> {
    const userId = await requireUserId();
    let q = db
      .from("view_yearly_category_totals")
      .select("*")
      .eq("user_id", userId);
    if (year) q = q.eq("year", year);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyCategoryTotalsRow[];
  },

  async monthlyTaggedTypeTotals(
    month?: string,
    tagsAny?: string[],
  ): Promise<MonthlyTaggedTypeTotalsRow[]> {
    const userId = await requireUserId();
    let q = db
      .from("view_monthly_tagged_type_totals")
      .select("*")
      .eq("user_id", userId);
    if (month) q = q.eq("month", month);
    if (tagsAny?.length) q = q.overlaps("tags", tagsAny);
    const { data, error } = await q;
    if (error) throw error;
    return data as MonthlyTaggedTypeTotalsRow[];
  },

  async yearlyTaggedTypeTotals(
    year?: string,
    tagsAny?: string[],
  ): Promise<YearlyTaggedTypeTotalsRow[]> {
    const userId = await requireUserId();
    let q = db
      .from("view_yearly_tagged_type_totals")
      .select("*")
      .eq("user_id", userId);
    if (year) q = q.eq("year", year);
    if (tagsAny?.length) q = q.overlaps("tags", tagsAny);
    const { data, error } = await q;
    if (error) throw error;
    return data as YearlyTaggedTypeTotalsRow[];
  },

  async taggedTypeTotals(tagsAny?: string[]): Promise<TaggedTypeTotalsRow[]> {
    const userId = await requireUserId();
    let q = db
      .from("view_tagged_type_totals")
      .select("*")
      .eq("user_id", userId);
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
