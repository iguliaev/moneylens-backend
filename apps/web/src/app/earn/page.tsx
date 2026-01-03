"use client";

import { DataApi } from "@providers/data-provider/api";
import type {
  MonthlyTotalsRow,
  Transaction,
  Category,
  BankAccount,
  Tag,
} from "@providers/data-provider/types";
import TagsMultiSelect from "@components/tags/multi-select";
import { StatCard } from "@/components/StatCard";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Check,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Save,
  X,
} from "lucide-react";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
  }).format(n);
}

function startOfMonthStr(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function endOfMonthFromStart(start: string) {
  const [y, m] = start.split("-").map(Number);
  const last = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export default function EarnPage() {
  const [month, setMonth] = useState<string>(startOfMonthStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotalsRow[]>([]);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [filters, setFilters] = useState<{
    categoryId: string;
    from: string;
    to: string;
    bankAccountId: string;
    tag: string;
  }>(() => {
    const from = month;
    const to = endOfMonthFromStart(month);
    return { categoryId: "", from, to, bankAccountId: "", tag: "" };
  });

  const [form, setForm] = useState<{
    date: string;
    categoryId: string;
    amount: string;
    bank_account_id: string;
    tags: string[];
    notes: string;
  }>({
    date: new Date().toISOString().slice(0, 10),
    categoryId: "",
    amount: "",
    bank_account_id: "",
    tags: [],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<
    Partial<Omit<Transaction, "amount" | "tags">> & {
      amount?: number | string;
      tags?: string[] | string | null;
    }
  >({});

  const monthLabel = useMemo(
    () =>
      new Date(month).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [month],
  );

  // Extract reload logic as a plain function (not useCallback)
  // This function will be recreated on every render with fresh closure values
  const fetchTransactions = async () => {
    const end = endOfMonthFromStart(month);
    const from = filters.from || month;
    const to = filters.to || end;

    const hasNonEmpty = !!(
      filters.categoryId ||
      filters.bankAccountId ||
      filters.tag
    );
    const isDefaultRange = from === month && to === end;
    const isApplied = hasNonEmpty || !isDefaultRange;

    const [totalsRes, rowsRes, filteredSum] = await Promise.all([
      DataApi.monthlyTotals(month),
      DataApi.listTransactions({
        type: "earn",
        from,
        to,
        categoryId: filters.categoryId || undefined,
        bankAccountId: filters.bankAccountId || undefined,
        tagsAny: filters.tag ? [filters.tag] : undefined,
        orderBy: "date",
        orderDir: "desc",
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      isApplied
        ? DataApi.sumTransactionsAmount({
            type: "earn",
            from,
            to,
            categoryId: filters.categoryId || undefined,
            bank_account:
              (filters.bankAccountId &&
                bankAccounts.find((b) => b.id === filters.bankAccountId)
                  ?.name) ||
              undefined,
            tagsAny: filters.tag ? [filters.tag] : undefined,
          })
        : Promise.resolve(null),
    ]);
    setMonthlyTotals(totalsRes);
    setRows(rowsRes);
    setFilteredTotal(filteredSum as number | null);
  };

  // Load initial reference data (categories, bank accounts, tags) on mount
  // This only runs once when the component mounts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [cats, bas, tags] = await Promise.all([
          DataApi.listCategories("earn"),
          DataApi.listBankAccounts(),
          DataApi.listTags(),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setBankAccounts(bas);
        setAllTags(tags);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load reference data");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Fetch transactions whenever dependencies change
  // This runs when month, page, filters, or bankAccounts change
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await fetchTransactions();
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load transactions");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, page, filters, bankAccounts]);

  useEffect(() => {
    setFilters((f) => ({ ...f, from: month, to: endOfMonthFromStart(month) }));
  }, [month]);

  // Reset page to 1 when month or filters change
  useEffect(() => {
    setPage(1);
  }, [month, filters]);

  const totalEarn = monthlyTotals.find((x) => x.type === "earn")?.total ?? 0;

  const filtersApplied = useMemo(() => {
    const end = endOfMonthFromStart(month);
    const from = filters.from || month;
    const to = filters.to || end;
    const hasNonEmpty = !!(
      filters.categoryId ||
      filters.bankAccountId ||
      filters.tag
    );
    const isDefaultRange = from === month && to === end;
    return hasNonEmpty || !isDefaultRange;
  }, [
    filters.categoryId,
    filters.bankAccountId,
    filters.tag,
    filters.from,
    filters.to,
    month,
  ]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await DataApi.createEarn({
        date: form.date,
        categoryId: form.categoryId || null,
        amount: parseFloat(form.amount || "0"),
        bank_account_id: form.bank_account_id || null,
        bank_account: form.bank_account_id
          ? (bankAccounts.find((b) => b.id === form.bank_account_id)?.name ??
            null)
          : null,
        tags: form.tags.length ? form.tags : null,
        notes: form.notes || null,
      });
      setForm((f) => ({ ...f, amount: "", notes: "" }));
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create earning");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: Transaction) {
    // Normalize tags into string[] (tag names) for the edit form
    const normalizedTags = Array.isArray((row as any).tags)
      ? (row as any).tags
          .map((tg: any) => (typeof tg === "string" ? tg : tg?.name))
          .filter(Boolean)
      : [];
    setEditingId(row.id);
    setEditDraft({ ...row, tags: normalizedTags });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }
  async function saveEdit() {
    if (!editingId) return;
    try {
      setSaving(true);
      const changes: any = {};
      const fields: (keyof Transaction)[] = [
        "date",
        "category",
        "category_id",
        "bank_account_id",
        "bank_account",
        "amount",
        "notes",
        "tags",
      ];
      for (const k of fields) {
        if (k in editDraft) changes[k] = (editDraft as any)[k];
      }
      if (typeof changes.amount === "string")
        changes.amount = parseFloat(changes.amount);
      if (typeof changes.tags === "string") {
        changes.tags = (changes.tags as string)
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
      if ("bank_account_id" in changes) {
        (changes as any).bank_account = changes.bank_account_id
          ? (bankAccounts.find((b) => b.id === (changes as any).bank_account_id)
              ?.name ?? null)
          : null;
      }
      await DataApi.updateTransaction(editingId, changes);
      setEditingId(null);
      setEditDraft({});
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update earning");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOne(id: string) {
    try {
      setSaving(true);
      await DataApi.deleteTransaction(id);
      setSelected((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    try {
      setSaving(true);
      await DataApi.deleteTransactions(ids);
      setSelected({});
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete selected");
    } finally {
      setSaving(false);
    }
  }

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected[r.id]);

  // Calculate if there are more pages (if we got fewer rows than pageSize, we're on the last page)
  const hasNextPage = rows.length >= pageSize;
  function toggleSelectAllPage() {
    const next: Record<string, boolean> = { ...selected };
    if (allOnPageSelected) {
      for (const r of rows) delete next[r.id];
    } else {
      for (const r of rows) next[r.id] = true;
    }
    setSelected(next);
  }

  function toggleRow(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Earn — {monthLabel}</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="border rounded px-2 py-1"
            value={month.slice(0, 7)}
            onChange={(e) => setMonth(`${e.target.value}-01`)}
            data-testid="earn-month-input"
          />
        </div>
      </header>

      {error && <div className="text-red-600">{error}</div>}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Earned (Current Month)"
          value={fmtCurrency(totalEarn)}
          className="bg-green-50 border-green-200"
          testId="earn-total-current-month"
        />
        {filtersApplied && (
          <StatCard
            title="Total Earned (Filtered)"
            value={fmtCurrency(filteredTotal ?? 0)}
            className="bg-blue-50 border-blue-200"
            testId="earn-total-filtered"
          />
        )}
      </section>

      <section className="border rounded p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500">Category</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.categoryId}
              onChange={(e) =>
                setFilters({ ...filters, categoryId: e.target.value })
              }
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">From</label>
            <input
              type="date"
              className="border rounded px-2 py-1 w-full"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              data-testid="earn-filter-from"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">To</label>
            <input
              type="date"
              className="border rounded px-2 py-1 w-full"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              data-testid="earn-filter-to"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Bank Account</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.bankAccountId}
              onChange={(e) =>
                setFilters({ ...filters, bankAccountId: e.target.value })
              }
            >
              <option value="">All</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Tag</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
            >
              <option value="">All</option>
              {allTags.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            data-testid="earn-apply-filters"
            className="px-3 py-1 rounded border flex items-center gap-2 hover:bg-gray-100"
            onClick={() => {
              setPage(1);
              fetchTransactions();
            }}
            aria-label="Apply filters"
          >
            <Check size={18} />
            <span>Apply</span>
          </button>
          <button
            data-testid="earn-reset-filters"
            className="px-3 py-1 rounded border flex items-center gap-2 hover:bg-gray-100"
            onClick={() => {
              setFilters({
                categoryId: "",
                from: month,
                to: endOfMonthFromStart(month),
                bankAccountId: "",
                tag: "",
              });
              setPage(1);
              fetchTransactions();
            }}
            aria-label="Reset filters"
          >
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <form
          onSubmit={handleCreate}
          className="border rounded p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        >
          <div>
            <label className="block text-xs text-gray-500">Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 w-full"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              data-testid="earn-form-date"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Category</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              data-testid="earn-form-category"
            >
              <option value="">— Select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Amount</label>
            <input
              type="number"
              step="0.01"
              className="border rounded px-2 py-1 w-full"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              data-testid="earn-form-amount"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Bank Account</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={form.bank_account_id}
              onChange={(e) =>
                setForm({ ...form, bank_account_id: e.target.value })
              }
              data-testid="earn-form-bank-account"
            >
              <option value="">— Select —</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Tags</label>
            <TagsMultiSelect
              options={allTags.map((t) => t.name)}
              value={form.tags}
              onChange={(vals) => setForm({ ...form, tags: vals })}
              placeholder="Select tags"
              testId="earn-form-tags"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Notes</label>
            <input
              type="text"
              className="border rounded px-2 py-1 w-full"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              data-testid="earn-form-notes"
            />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button
              data-testid="earn-add-transaction"
              className="px-3 py-1 rounded border flex items-center gap-2 hover:bg-green-50 disabled:opacity-50"
              disabled={saving}
              aria-label="Add new earning transaction"
            >
              <Plus size={18} />
              <span>{saving ? "Saving…" : "Add Earning"}</span>
            </button>
          </div>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Transactions</h2>
            <div className="flex items-center gap-2">
              <button
                data-testid="earn-prev-page"
                className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1"
                disabled={page <= 1 || rows.length === 0}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm px-2">Page {page}</span>
              <button
                data-testid="earn-next-page"
                className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1"
                disabled={!hasNextPage || rows.length === 0}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
              <button
                data-testid="earn-delete-selected"
                className="px-3 py-1 rounded border flex items-center gap-2 hover:bg-red-50 disabled:opacity-50"
                disabled={!Object.values(selected).some(Boolean) || saving}
                onClick={deleteSelected}
                aria-label="Delete selected transactions"
              >
                <Trash2 size={18} />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllPage}
                      data-testid="earn-select-all"
                    />
                  </th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Bank Account</th>
                  <th className="py-2">Tags</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t align-top"
                    data-testid="earn-row"
                  >
                    <td className="py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.id}`}
                        checked={!!selected[t.id]}
                        onChange={() => toggleRow(t.id)}
                        data-testid="earn-row-select"
                      />
                    </td>
                    <td className="py-2">
                      {editingId === t.id ? (
                        <input
                          type="date"
                          className="border rounded px-2 py-1"
                          value={(editDraft.date as any) ?? t.date}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, date: e.target.value })
                          }
                          data-testid="earn-edit-date"
                        />
                      ) : (
                        new Date(t.date).toLocaleDateString()
                      )}
                    </td>
                    <td className="py-2" data-testid="earn-row-category">
                      {editingId === t.id ? (
                        <select
                          className="border rounded px-2 py-1"
                          value={
                            (editDraft.category_id as any) ??
                            (t as any).category_id ??
                            ""
                          }
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              category_id: e.target.value,
                            })
                          }
                        >
                          <option value="">— Select —</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : t.category || (t as any).category_id ? (
                        (categories.find((c) => c.id === (t as any).category_id)
                          ?.name ?? "—")
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className="py-2 text-right"
                      data-testid="earn-row-amount"
                    >
                      {editingId === t.id ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="border rounded px-2 py-1 text-right"
                          value={String((editDraft.amount as any) ?? t.amount)}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              amount: e.target.value,
                            })
                          }
                          data-testid="earn-edit-amount"
                        />
                      ) : (
                        fmtCurrency(t.amount)
                      )}
                    </td>
                    <td className="py-2" data-testid="earn-row-bank-account">
                      {editingId === t.id ? (
                        <select
                          className="border rounded px-2 py-1"
                          value={
                            (editDraft as any).bank_account_id ??
                            (t as any).bank_account_id ??
                            ""
                          }
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              bank_account_id: e.target.value,
                            })
                          }
                        >
                          <option value="">— Select —</option>
                          {bankAccounts.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        t.bank_account || "—"
                      )}
                    </td>
                    <td className="py-2" data-testid="earn-row-tags">
                      {editingId === t.id ? (
                        <TagsMultiSelect
                          options={allTags.map((tg) => tg.name)}
                          value={
                            Array.isArray(editDraft.tags)
                              ? (editDraft.tags as string[])
                              : t.tags && Array.isArray(t.tags)
                                ? (t.tags as any[]).map((tg) =>
                                    typeof tg === "string" ? tg : tg?.name,
                                  )
                                : []
                          }
                          onChange={(vals) =>
                            setEditDraft({ ...editDraft, tags: vals })
                          }
                          testId="earn-edit-tags"
                        />
                      ) : t.tags && Array.isArray(t.tags) ? (
                        (t.tags as any[])
                          .map((tg) => (typeof tg === "string" ? tg : tg?.name))
                          .join(", ")
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2" data-testid="earn-row-notes">
                      {editingId === t.id ? (
                        <input
                          type="text"
                          className="border rounded px-2 py-1"
                          value={(editDraft.notes as any) ?? t.notes ?? ""}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              notes: e.target.value,
                            })
                          }
                          data-testid="earn-edit-notes"
                        />
                      ) : (
                        t.notes || "—"
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {editingId === t.id ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            data-testid="earn-save-edit"
                            className="px-2 py-1 rounded border hover:bg-green-50 disabled:opacity-50"
                            disabled={saving}
                            onClick={saveEdit}
                            title="Save changes"
                            aria-label="Save changes"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            data-testid="earn-cancel-edit"
                            className="px-2 py-1 rounded border hover:bg-gray-100"
                            onClick={cancelEdit}
                            title="Cancel editing"
                            aria-label="Cancel editing"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            data-testid="earn-start-edit"
                            className="px-2 py-1 rounded border hover:bg-blue-50"
                            onClick={() => startEdit(t)}
                            title="Edit transaction"
                            aria-label="Edit transaction"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            data-testid="earn-delete-transaction"
                            className="px-2 py-1 rounded border hover:bg-red-50 disabled:opacity-50"
                            disabled={saving}
                            onClick={() => deleteOne(t.id)}
                            title="Delete transaction"
                            aria-label="Delete transaction"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {loading && <div className="opacity-60">Loading…</div>}
    </div>
  );
}
