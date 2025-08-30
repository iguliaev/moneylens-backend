export type TransactionType = 'earn' | 'spend' | 'save';

export interface Transaction {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string | null;
  category_id?: string | null;
  bank_account_id?: string | null;
  amount: number;
  tags: string[] | null;
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
  to?: string;   // YYYY-MM-DD
  type?: TransactionType;
  categoryId?: string;
  bankAccountId?: string;
  bank_account?: string;
  tagsAny?: string[]; // match any of these tags
  tagsAll?: string[]; // must include all of these tags
  limit?: number;
  offset?: number;
  orderBy?: keyof Transaction;
  orderDir?: 'asc' | 'desc';
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
