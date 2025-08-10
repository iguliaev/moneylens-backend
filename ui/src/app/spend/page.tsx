"use client";

import { DataApi } from "@providers/data-provider/api";
import type { MonthlyTotalsRow, Transaction } from "@providers/data-provider/types";
import { useEffect, useMemo, useState } from "react";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP" }).format(n);
}

function startOfMonthISO(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  return x.toISOString().slice(0, 10);
}

function endOfMonthISO(iso: string) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export default function SpendPage() {
  const [month, setMonth] = useState<string>(startOfMonthISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotalsRow[]>([]);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Create form state
  const [form, setForm] = useState<{ date: string; category: string; amount: string; bank_account: string; tags: string; notes: string }>({
    date: new Date().toISOString().slice(0, 10),
    category: "",
    amount: "",
    bank_account: "",
    tags: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Editing state per row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<
    Partial<Omit<Transaction, "amount" | "tags">> & {
      amount?: number | string;
      tags?: string[] | string | null;
    }
  >({});

  const monthLabel = useMemo(() => new Date(month).toLocaleDateString(undefined, { month: "long", year: "numeric" }), [month]);

  async function reload() {
    const end = endOfMonthISO(month);
    const [totalsRes, rowsRes] = await Promise.all([
      DataApi.monthlyTotals(month),
      DataApi.listTransactions({ type: "spend", from: month, to: end, orderBy: "date", orderDir: "desc", limit: pageSize, offset: (page - 1) * pageSize }),
    ]);
    setMonthlyTotals(totalsRes);
    setRows(rowsRes);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await reload();
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load spendings");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [month, page, pageSize]);

  const totalSpend = monthlyTotals.find((x) => x.month === month && x.type === "spend")?.total ?? 0;

  // Handlers: create
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await DataApi.createSpend({
        date: form.date,
        category: form.category || null,
        amount: parseFloat(form.amount || "0"),
        bank_account: form.bank_account || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        notes: form.notes || null,
      });
      // Reset and reload
      setForm((f) => ({ ...f, amount: "", notes: "" }));
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create spending");
    } finally {
      setSaving(false);
    }
  }

  // Handlers: edit row
  function startEdit(row: Transaction) {
    setEditingId(row.id);
    setEditDraft({ ...row });
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
      const fields: (keyof Transaction)[] = ["date", "category", "amount", "bank_account", "notes", "tags"];
      for (const k of fields) {
        if (k in editDraft) changes[k] = (editDraft as any)[k];
      }
      if (typeof changes.amount === "string") changes.amount = parseFloat(changes.amount);
      if (typeof changes.tags === "string") changes.tags = (changes.tags as string).split(",").map((t: string) => t.trim()).filter(Boolean);
      await DataApi.updateTransaction(editingId, changes);
      setEditingId(null);
      setEditDraft({});
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update spending");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Spend — {monthLabel}</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="border rounded px-2 py-1"
            value={month.slice(0, 7)}
            onChange={(e) => setMonth(`${e.target.value}-01`)}
          />
        </div>
      </header>

      {error && <div className="text-red-600">{error}</div>}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Spent (Current Month)" value={fmtCurrency(totalSpend)} className="bg-red-50 border-red-200" />
      </section>

      <section className="space-y-4">
        <form onSubmit={handleCreate} className="border rounded p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500">Date</label>
            <input type="date" className="border rounded px-2 py-1 w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Category</label>
            <input type="text" className="border rounded px-2 py-1 w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Amount</label>
            <input type="number" step="0.01" min="0" className="border rounded px-2 py-1 w-full" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Bank Account</label>
            <input type="text" className="border rounded px-2 py-1 w-full" value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Tags (comma-separated)</label>
            <input type="text" className="border rounded px-2 py-1 w-full" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Notes</label>
            <input type="text" className="border rounded px-2 py-1 w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button className="px-3 py-1 rounded border" disabled={saving}>{saving ? "Saving…" : "Add Spending"}</button>
          </div>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Transactions</h2>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded border" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </button>
              <span className="text-sm">Page {page}</span>
              <button className="px-3 py-1 rounded border" onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
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
                  <tr key={t.id} className="border-t align-top">
                    <td className="py-2">
                      {editingId === t.id ? (
                        <input type="date" className="border rounded px-2 py-1" value={(editDraft.date as any) ?? t.date} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} />
                      ) : (
                        new Date(t.date).toLocaleDateString()
                      )}
                    </td>
                    <td className="py-2">
                      {editingId === t.id ? (
                        <input type="text" className="border rounded px-2 py-1" value={(editDraft.category as any) ?? t.category ?? ""} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })} />
                      ) : (
                        t.category || "—"
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {editingId === t.id ? (
                        <input type="number" step="0.01" min="0" className="border rounded px-2 py-1 text-right" value={String((editDraft.amount as any) ?? t.amount)} onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })} />
                      ) : (
                        fmtCurrency(t.amount)
                      )}
                    </td>
                    <td className="py-2">
                      {editingId === t.id ? (
                        <input type="text" className="border rounded px-2 py-1" value={(editDraft.bank_account as any) ?? t.bank_account ?? ""} onChange={(e) => setEditDraft({ ...editDraft, bank_account: e.target.value })} />
                      ) : (
                        t.bank_account || "—"
                      )}
                    </td>
                    <td className="py-2">
                      {editingId === t.id ? (
                        <input type="text" className="border rounded px-2 py-1" value={(typeof editDraft.tags === 'string' ? (editDraft.tags as any) : (editDraft.tags as any)?.join(', ')) ?? (t.tags?.join(', ') ?? '')} onChange={(e) => setEditDraft({ ...editDraft, tags: e.target.value })} />
                      ) : (
                        t.tags?.join(', ') || "—"
                      )}
                    </td>
                    <td className="py-2">
                      {editingId === t.id ? (
                        <input type="text" className="border rounded px-2 py-1" value={(editDraft.notes as any) ?? t.notes ?? ""} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} />
                      ) : (
                        t.notes || "—"
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {editingId === t.id ? (
                        <div className="flex gap-2 justify-end">
                          <button className="px-3 py-1 rounded border" disabled={saving} onClick={saveEdit}>Save</button>
                          <button className="px-3 py-1 rounded border" onClick={cancelEdit}>Cancel</button>
                        </div>
                      ) : (
                        <button className="px-3 py-1 rounded border" onClick={() => startEdit(t)}>Edit</button>
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

function StatCard({ title, value, className = "" }: { title: string; value: string; className?: string }) {
  return (
    <div className={`border rounded p-4 ${className}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
