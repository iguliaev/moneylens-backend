"use client";

import { useEffect, useMemo, useState } from "react";
import { DataApi } from "@providers/data-provider/api";
import type { Category, TransactionType } from "@providers/data-provider/types";

const TYPES: TransactionType[] = ["spend", "earn", "save"];

export default function CategoriesSettingsPage() {
  const [type, setType] = useState<TransactionType>("spend");
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = async (t = type) => {
    setLoading(true);
    try {
      const rows = await DataApi.listCategories(t);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await DataApi.createCategory({ type, name: name.trim(), description: description.trim() || null });
    setName("");
    setDescription("");
    await refresh();
  };

  const onRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    await DataApi.updateCategory(id, { name: newName.trim() });
    await refresh();
  };

  const onUpdateDescription = async (id: string, newDesc: string) => {
    await DataApi.updateCategory(id, { description: newDesc || null });
    await refresh();
  };

  const onDelete = async (id: string) => {
    await DataApi.deleteCategory(id);
    await refresh();
  };

  const byName = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Categories</h1>

      <div className="flex gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded border ${t === type ? "bg-black text-white" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-2 py-1 rounded"
            placeholder="e.g., Food"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border px-2 py-1 rounded"
            placeholder="Notes..."
          />
        </div>
        <button className="px-3 py-2 border rounded" disabled={loading}>Add</button>
      </form>

      <div className="border rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Description</th>
              <th className="p-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {byName.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">
                  <InlineEdit value={c.name} onSave={(v) => onRename(c.id, v)} />
                </td>
                <td className="p-2">
                  <InlineEdit value={c.description ?? ""} onSave={(v) => onUpdateDescription(c.id, v)} />
                </td>
                <td className="p-2">
                  <button className="px-2 py-1 border rounded" onClick={() => onDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && byName.length === 0 && (
              <tr><td className="p-4 text-sm text-gray-500" colSpan={3}>No categories yet for “{type}”. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> | void }) {
  const [val, setVal] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => setVal(value), [value]);
  if (!editing) {
    return <span onClick={() => setEditing(true)} className="cursor-text">{value || "—"}</span>;
  }
  return (
    <span className="flex gap-2">
      <input className="border px-2 py-1 rounded" value={val} onChange={(e) => setVal(e.target.value)} />
      <button className="px-2 py-1 border rounded" onClick={async () => { await onSave(val); setEditing(false); }}>Save</button>
      <button className="px-2 py-1 border rounded" onClick={() => { setVal(value); setEditing(false); }}>Cancel</button>
    </span>
  );
}
