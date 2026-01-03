"use client";

import { useEffect, useMemo, useState } from "react";
import { DataApi } from "@providers/data-provider/api";
import type { BankAccount } from "@providers/data-provider/types";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";

export default function BankAccountsSettingsPage() {
  const [items, setItems] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string }>({
    name: "",
    description: "",
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await DataApi.listBankAccounts();
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
      await DataApi.createBankAccount({
        name: name.trim(),
        description: description.trim() || null,
      });
      setName("");
      setDescription("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create bank account");
    }
  };

  function startEdit(row: BankAccount) {
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
      await DataApi.updateBankAccount(id, payload);
      setEditingId(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update bank account");
    }
  }

  const onDelete = async (id: string) => {
    try {
      setError(null);
      await DataApi.deleteBankAccount(id);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to delete bank account");
    }
  };

  const byName = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Bank Accounts</h1>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-2 py-1 rounded"
            placeholder="e.g., Checking"
            data-testid="bank-accounts-create-name"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border px-2 py-1 rounded"
            placeholder="Notes..."
            data-testid="bank-accounts-create-description"
          />
        </div>
        <button
          className="px-3 py-2 border rounded flex items-center gap-2 hover:bg-green-50 disabled:opacity-50"
          disabled={loading}
          data-testid="bank-accounts-create-submit"
        >
          <Plus size={18} />
          <span>Add</span>
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
                <tr
                  key={row.id}
                  className="border-t"
                  data-testid="bank-accounts-row"
                >
                  <td className="p-2" data-testid="bank-accounts-row-name">
                    {isEditing ? (
                      <input
                        className="border px-2 py-1 rounded w-full"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        placeholder="Account name"
                        data-testid="bank-accounts-row-edit-name"
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
                  <td
                    className="p-2"
                    data-testid="bank-accounts-row-description"
                  >
                    {isEditing ? (
                      <input
                        className="border px-2 py-1 rounded w-full"
                        value={draft.description}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Description (optional)"
                        data-testid="bank-accounts-row-edit-description"
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
                        <button
                          className="px-2 py-1 border rounded hover:bg-green-50 disabled:opacity-50"
                          onClick={() => void saveEdit(row.id)}
                          title="Save changes"
                          aria-label="Save changes"
                          data-testid="bank-accounts-row-save"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          className="px-2 py-1 border rounded hover:bg-gray-100"
                          onClick={cancelEdit}
                          title="Cancel editing"
                          aria-label="Cancel editing"
                          data-testid="bank-accounts-row-cancel"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="px-2 py-1 border rounded hover:bg-blue-50"
                          onClick={() => startEdit(row)}
                          title="Edit bank account"
                          aria-label="Edit bank account"
                          data-testid="bank-accounts-row-edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="px-2 py-1 border rounded hover:bg-red-50 disabled:opacity-50"
                          disabled={(row.in_use_count ?? 0) > 0}
                          title={
                            (row.in_use_count ?? 0) > 0
                              ? `Cannot delete — used by ${row.in_use_count} transaction(s)`
                              : "Delete bank account"
                          }
                          onClick={() => onDelete(row.id)}
                          aria-label="Delete bank account"
                          data-testid="bank-accounts-row-delete"
                        >
                          <Trash2 size={18} />
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
                  No bank accounts yet. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
