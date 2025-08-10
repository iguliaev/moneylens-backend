"use client";

import { useEffect, useMemo, useState } from "react";
import { DataApi } from "@providers/data-provider/api";
import type {
  MonthlyTotalsRow,
  MonthlyCategoryTotalsRow,
  MonthlyTaggedTypeTotalsRow,
} from "@providers/data-provider/types";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP" }).format(n);
}

function startOfMonthISO(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  return x.toISOString().slice(0, 10);
}

function addMonths(iso: string, delta: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [month, setMonth] = useState<string>(startOfMonthISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totals, setTotals] = useState<MonthlyTotalsRow[]>([]);
  const [catTotals, setCatTotals] = useState<MonthlyCategoryTotalsRow[]>([]);
  const [tagTotals, setTagTotals] = useState<MonthlyTaggedTypeTotalsRow[]>([]);

  const monthLabel = useMemo(() => new Date(month).toLocaleDateString(undefined, { month: "long", year: "numeric" }), [month]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [t, c, g] = await Promise.all([
          DataApi.monthlyTotals(month),
          DataApi.monthlyCategoryTotals(month),
          DataApi.monthlyTaggedTypeTotals(month, undefined),
        ]);
        if (!mounted) return;
        setTotals(t);
        setCatTotals(c);
        setTagTotals(g);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load dashboard");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [month]);

  const spend = totals.find((x) => x.type === "spend")?.total ?? 0;
  const earn = totals.find((x) => x.type === "earn")?.total ?? 0;
  const save = totals.find((x) => x.type === "save")?.total ?? 0;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard — {monthLabel}</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded border" onClick={() => setMonth((m) => addMonths(m, -1))}>&larr; Prev</button>
          <input
            type="month"
            className="border rounded px-2 py-1"
            value={month.slice(0, 7)}
            onChange={(e) => setMonth(`${e.target.value}-01`)}
          />
          <button className="px-3 py-1 rounded border" onClick={() => setMonth(startOfMonthISO())}>This Month</button>
          <button className="px-3 py-1 rounded border" onClick={() => setMonth((m) => addMonths(m, 1))}>Next &rarr;</button>
        </div>
      </header>

      {error && <div className="text-red-600">{error}</div>}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Spent" value={fmtCurrency(spend)} className="bg-red-50 border-red-200" />
        <StatCard title="Earned" value={fmtCurrency(earn)} className="bg-green-50 border-green-200" />
        <StatCard title="Saved" value={fmtCurrency(save)} className="bg-blue-50 border-blue-200" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Top Categories">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Category</th>
                <th className="py-2">Type</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {catTotals
                .slice()
                .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                .slice(0, 10)
                .map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2">{row.category || "(uncategorized)"}</td>
                    <td className="py-2 capitalize">{row.type}</td>
                    <td className="py-2 text-right">{fmtCurrency(row.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Top Tags">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Tags</th>
                <th className="py-2">Type</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {tagTotals
                .slice()
                .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                .slice(0, 10)
                .map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2">{row.tags?.join(", ") || "(no tags)"}</td>
                    <td className="py-2 capitalize">{row.type}</td>
                    <td className="py-2 text-right">{fmtCurrency(row.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Panel>
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

function Panel({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  );
}
