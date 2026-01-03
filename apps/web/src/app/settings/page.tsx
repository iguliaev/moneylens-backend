"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BulkUploadCard } from "@/components/bulk-upload/BulkUploadCard";
import { DataResetModal } from "@/components/data-reset/DataResetModal";
import { DataApi } from "@/providers/data-provider/api";
import type { DataResetResult } from "@/providers/data-provider/types";

export default function SettingsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetResult, setResetResult] = useState<DataResetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResetData = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const result = await DataApi.resetUserData();
      setResetResult(result);
      setIsModalOpen(false);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset data");
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      {/* Success Message */}
      {resetResult && (
        <div
          className="bg-green-50 border border-green-200 rounded p-4"
          data-testid="data-reset-success"
        >
          <h3 className="text-green-800 font-medium mb-2">
            ✓ Data Reset Complete
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• {resetResult.transactions_deleted} transactions deleted</li>
            <li>• {resetResult.categories_deleted} categories deleted</li>
            <li>• {resetResult.tags_deleted} tags deleted</li>
            <li>• {resetResult.bank_accounts_deleted} bank accounts deleted</li>
          </ul>
          <p className="text-sm text-green-600 mt-2">
            Redirecting to dashboard...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      )}

      <section className="border rounded p-4">
        <h2 className="text-lg font-medium mb-2">Manage</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <Link
              href="/settings/categories"
              className="text-blue-600 hover:underline"
            >
              Categories
            </Link>
          </li>
          <li>
            <Link
              href="/settings/tags"
              className="text-blue-600 hover:underline"
            >
              Tags
            </Link>
          </li>
          <li>
            <Link
              href="/settings/bank-accounts"
              className="text-blue-600 hover:underline"
            >
              Bank Accounts
            </Link>
          </li>
        </ul>
      </section>

      <section className="border rounded p-4">
        <h2 className="text-lg font-medium mb-4">Upload Data</h2>
        <div className="max-w-2xl">
          <BulkUploadCard />
        </div>
      </section>

      {/* Danger Zone - Data Reset Section */}
      <section className="border border-red-200 rounded p-4 bg-red-50">
        <h2 className="text-lg font-medium text-red-800 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-700 mb-4">
          Permanently delete all your data. This action cannot be undone.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="settings-reset-data-button"
        >
          Reset All Data
        </button>
      </section>

      <DataResetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleResetData}
        isLoading={isDeleting}
      />
    </div>
  );
}
