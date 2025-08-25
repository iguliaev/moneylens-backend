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
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string }>({ name: "", description: "" });

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
    try {
      setError(null);
      await DataApi.createCategory({ type, name: name.trim(), description: description.trim() || null });
      setName("");
      setDescription("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create category");
    }
  };

  const onRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      setError(null);
      await DataApi.updateCategory(id, { name: newName.trim() });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to rename category");
      throw e; // let InlineEdit show inline error too
    }
  };

  const onUpdateDescription = async (id: string, newDesc: string) => {
    try {
      setError(null);
      await DataApi.updateCategory(id, { description: newDesc || null });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update description");
      throw e;
    }
  };

  function startEdit(c: Category) {
    setEditingId(c.id);
    setDraft({ name: c.name, description: c.description ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ name: "", description: "" });
  }

  async function saveEdit(id: string) {
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() ? draft.description.trim() : null,
    } as { name?: string; description?: string | null };
    if (!payload.name) {
      setError("Name is required");
      return;
    }
    try {
      setError(null);
      await DataApi.updateCategory(id, payload);
      setEditingId(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update category");
    }
  }

  const onDelete = async (id: string) => {
    try {
      setError(null);
      await DataApi.deleteCategory(id);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to delete category");
    }
  };

  const byName = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Categories</h1>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}

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
              <th className="p-2 w-24">Usage</th>
              <th className="p-2 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {byName.map((c) => {
              const isEditing = editingId === c.id;
              return (
                <tr key={c.id} className="border-t">
                  <td className="p-2">
                    {isEditing ? (
                      <input
                        className="border px-2 py-1 rounded w-full"
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Category name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); void saveEdit(c.id); }
                          if (e.key === "Escape") { cancelEdit(); }
                        }}
                      />
                    ) : (
                      <span>{c.name || "—"}</span>
                    )}
                  </td>
                  <td className="p-2">
                    {isEditing ? (
                      <input
                        className="border px-2 py-1 rounded w-full"
                        value={draft.description}
                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        placeholder="Description (optional)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); void saveEdit(c.id); }
                          if (e.key === "Escape") { cancelEdit(); }
                        }}
                      />
                    ) : (
                      <span>{c.description || "—"}</span>
                    )}
                  </td>
                  <td className="p-2">{c.in_use_count ?? 0}</td>
                  <td className="p-2 flex gap-2">
                    {isEditing ? (
                      <>
                        <button className="px-2 py-1 border rounded" onClick={() => void saveEdit(c.id)}>Update</button>
                        <button className="px-2 py-1 border rounded" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="px-2 py-1 border rounded" onClick={() => startEdit(c)}>Edit</button>
                        <button
                          className="px-2 py-1 border rounded disabled:opacity-50"
                          disabled={(c.in_use_count ?? 0) > 0}
                          title={(c.in_use_count ?? 0) > 0 ? `Cannot delete — used by ${(c.in_use_count ?? 0)} transaction(s)` : "Delete"}
                          onClick={() => onDelete(c.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && byName.length === 0 && (
              <tr><td className="p-4 text-sm text-gray-500" colSpan={3}>No categories yet for “{type}”. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
