export type TransactionType = "earn" | "spend" | "save";

export interface Transaction {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  /**
   * Resolved category name (from view or legacy `category` field).
   */
  category: string | null;

  /**
   * Authoritative FK id for the category (may be present when querying
   * the base table or the enriched views). Useful for pre-selecting dropdowns
   * in edit forms.
   */
  category_id?: string | null;

  /**
   * Authoritative FK id for the bank account (may be present when querying
   * the base table or the enriched views). Useful for pre-selecting dropdowns
   * in edit forms.
   */
  bank_account_id?: string | null;
  amount: number;
  tags: Tag[] | null;
  notes: string | null;
  bank_account: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  type: TransactionType;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  in_use_count?: number; // populated when reading from categories_with_usage
}

export interface MonthlyTotalsRow {
  month: string; // YYYY-MM-01
  type: TransactionType;
  total: number;
}

export interface YearlyTotalsRow {
  year: string; // YYYY-01-01
  type: TransactionType;
  total: number;
}

export interface MonthlyCategoryTotalsRow {
  month: string; // YYYY-MM-01
  category: string | null;
  type: TransactionType;
  total: number;
}

export interface YearlyCategoryTotalsRow {
  year: string; // YYYY-01-01
  category: string | null;
  type: TransactionType;
  total: number;
}

export interface MonthlyTaggedTypeTotalsRow {
  month: string; // YYYY-MM-01
  type: TransactionType;
  tags: string[] | null;
  total: number;
}

export interface YearlyTaggedTypeTotalsRow {
  year: string; // YYYY-01-01
  type: TransactionType;
  tags: string[] | null;
  total: number;
}

export interface TaggedTypeTotalsRow {
  type: TransactionType;
  tags: string[] | null;
  total: number;
}

export interface ListTransactionsParams {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  type?: TransactionType;
  categoryId?: string;
  bankAccountId?: string;
  bank_account?: string;
  tagsAny?: string[]; // match any of these tags
  tagsAll?: string[]; // must include all of these tags
  limit?: number;
  offset?: number;
  orderBy?: keyof Transaction;
  orderDir?: "asc" | "desc";
}

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  in_use_count?: number; // populated from bank_accounts_with_usage
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  in_use_count?: number; // populated from tags_with_usage
}

// Types for bulk upload feature (Task 3.1 - Entity Types)
export interface CategoryInput {
  type: TransactionType;
  name: string;
  description?: string | null;
}

export interface BankAccountInput {
  name: string;
  description?: string | null;
}

export interface TagInput {
  name: string;
  description?: string | null;
}

// Types for bulk upload feature (existing - Transaction Type)
export interface BulkTransactionInput {
  date: string; // YYYY-MM-DD format
  type: TransactionType;
  amount: number;
  category?: string | null; // Category name (optional)
  bank_account?: string | null; // Bank account name (optional)
  tags?: string[] | null; // Array of tag names (optional)
  notes?: string | null; // Free text notes (optional)
}

// Extended bulk upload payload supporting entities
export interface BulkUploadPayload {
  categories?: CategoryInput[];
  bank_accounts?: BankAccountInput[];
  tags?: TagInput[];
  transactions?: BulkTransactionInput[];
}

export interface BulkUploadResult {
  success: boolean;
  error?: string;
  categories_inserted?: number;
  bank_accounts_inserted?: number;
  tags_inserted?: number;
  transactions_inserted?: number;
  details?: {
    categories?: BulkUploadError[];
    bank_accounts?: BulkUploadError[];
    tags?: BulkUploadError[];
    transactions?: BulkUploadError[];
  };
}

export interface BulkUploadError {
  index: number; // 1-based index matching input order
  error: string;
}

// Phase 3: Data Reset Feature
export interface DataResetResult {
  success: boolean;
  transactions_deleted: number;
  categories_deleted: number;
  tags_deleted: number;
  bank_accounts_deleted: number;
}
