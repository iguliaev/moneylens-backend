"use client";

import { useEffect, useMemo, useState } from "react";
import { DataApi } from "@providers/data-provider/api";
import type { MonthlyTotalsRow, Transaction } from "@providers/data-provider/types";

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

  const monthLabel = useMemo(() => new Date(month).toLocaleDateString(undefined, { month: "long", year: "numeric" }), [month]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const end = endOfMonthISO(month);
        const [totalsRes, rowsRes] = await Promise.all([
          DataApi.monthlyTotals(month),
          DataApi.listTransactions({ type: "spend", from: month, to: end, orderBy: "date", orderDir: "desc", limit: pageSize, offset: (page - 1) * pageSize }),
        ]);
        if (!mounted) return;
        setMonthlyTotals(totalsRes);
        setRows(rowsRes);
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

      <section className="space-y-2">
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
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="py-2">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="py-2">{t.category || "—"}</td>
                  <td className="py-2 text-right">{fmtCurrency(t.amount)}</td>
                  <td className="py-2">{t.bank_account || "—"}</td>
                  <td className="py-2">{t.tags?.join(', ') || "—"}</td>
                  <td className="py-2">{t.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
