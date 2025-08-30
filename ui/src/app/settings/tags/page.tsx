"use client";

import { useEffect, useMemo, useState } from "react";
import { DataApi } from "@providers/data-provider/api";
import type { Tag } from "@providers/data-provider/types";

export default function TagsSettingsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string }>({ name: "", description: "" });

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await DataApi.listTags();
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setError(null);
      await DataApi.createTag({ name: name.trim(), description: description.trim() || null });
      setName("");
      setDescription("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create tag");
    }
  };

  function startEdit(row: Tag) {
    setEditingId(row.id);
    setDraft({ name: row.name, description: row.description ?? "" });
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
      await DataApi.updateTag(id, payload);
      setEditingId(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update tag");
    }
  }

  const onDelete = async (id: string) => {
    try {
      setError(null);
      await DataApi.deleteTag(id);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to delete tag");
    }
  };

  const byName = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Tags</h1>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 rounded">{error}</div>
      )}

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-2 py-1 rounded"
            placeholder="e.g., groceries"
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
        <button className="px-3 py-2 border rounded" disabled={loading}>
          Add
        </button>
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
            {byName.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <tr key={row.id} className="border-t">
                  <td className="p-2">
                    {isEditing ? (
                      <input
                        className="border px-2 py-1 rounded w-full"
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Tag name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveEdit(row.id);
                          }
                          if (e.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                      />
                    ) : (
                      <span>{row.name || "—"}</span>
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
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveEdit(row.id);
                          }
                          if (e.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                      />
                    ) : (
                      <span>{row.description || "—"}</span>
                    )}
                  </td>
                  <td className="p-2">{row.in_use_count ?? 0}</td>
                  <td className="p-2 flex gap-2">
                    {isEditing ? (
                      <>
                        <button className="px-2 py-1 border rounded" onClick={() => void saveEdit(row.id)}>
                          Update
                        </button>
                        <button className="px-2 py-1 border rounded" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="px-2 py-1 border rounded" onClick={() => startEdit(row)}>
                          Edit
                        </button>
                        <button
                          className="px-2 py-1 border rounded disabled:opacity-50"
                          disabled={(row.in_use_count ?? 0) > 0}
                          title={(row.in_use_count ?? 0) > 0 ? `Cannot delete — used by ${row.in_use_count} transaction(s)` : "Delete"}
                          onClick={() => onDelete(row.id)}
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
              <tr>
                <td className="p-4 text-sm text-gray-500" colSpan={3}>
                  No tags yet. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
