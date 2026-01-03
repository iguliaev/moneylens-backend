"use client";

import React, { useState } from "react";
import { DataApi, RpcError } from "@/providers/data-provider/api";
import type {
  BulkUploadPayload,
  BulkUploadResult,
  BulkUploadError,
} from "@/providers/data-provider/types";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function BulkUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [errors, setErrors] = useState<BulkUploadError[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setErrors([]);
    setFileError(null);
    setPreview(null);

    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError("File is too large. Maximum allowed size is 1MB.");
      return;
    }

    if (selected.type && selected.type !== "application/json") {
      // Some browsers may not set type for .json files; we'll still allow by extension
      if (!selected.name.toLowerCase().endsWith(".json")) {
        setFile(null);
        setFileError("Invalid file type. Please upload a JSON file.");
        return;
      }
    }

    setFile(selected);

    // Parse file to generate preview
    try {
      const text = await selected.text();
      const payload = parseUploadFile(text);
      setPreview(getUploadSummary(payload));
    } catch (parseErr) {
      setFileError(
        parseErr instanceof Error
          ? parseErr.message
          : "Failed to parse JSON file. Please ensure it is valid JSON.",
      );
      setFile(null);
    }
  };

  // Helper to clear the native file input element's value
  const clearFileInput = () => {
    const input = document.getElementById(
      "bulk-upload-input",
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  // Task 3.3: Parse uploaded file - handle new format with entities
  const parseUploadFile = (fileContent: string): BulkUploadPayload => {
    const parsed = JSON.parse(fileContent);

    // Handle legacy array format: [...]
    if (Array.isArray(parsed)) {
      return { transactions: parsed };
    }

    // Handle legacy object format: { transactions: [...] }
    // or new format: { categories: [...], bank_accounts: [...], tags: [...], transactions: [...] }
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      return {
        categories: Array.isArray(obj.categories) ? obj.categories : undefined,
        bank_accounts: Array.isArray(obj.bank_accounts)
          ? obj.bank_accounts
          : undefined,
        tags: Array.isArray(obj.tags) ? obj.tags : undefined,
        transactions: Array.isArray(obj.transactions)
          ? obj.transactions
          : undefined,
      };
    }

    throw new Error(
      "JSON must be an array of transactions or an object with optional sections: categories, bank_accounts, tags, transactions",
    );
  };

  // Task 3.3: Get upload summary for preview
  const getUploadSummary = (payload: BulkUploadPayload): string => {
    const parts: string[] = [];
    if (payload.categories?.length)
      parts.push(`${payload.categories.length} categories`);
    if (payload.bank_accounts?.length)
      parts.push(`${payload.bank_accounts.length} bank accounts`);
    if (payload.tags?.length) parts.push(`${payload.tags.length} tags`);
    if (payload.transactions?.length)
      parts.push(`${payload.transactions.length} transactions`);
    return parts.join(", ") || "No data";
  };

  // Task 3.4: Handle upload execution with new API
  const handleUpload = async () => {
    setFileError(null);
    setResult(null);
    setErrors([]);

    if (!file) {
      setFileError("No file selected.");
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      let payload: BulkUploadPayload;

      try {
        payload = parseUploadFile(text);
      } catch (parseErr) {
        setFileError(
          parseErr instanceof Error
            ? parseErr.message
            : "Failed to parse JSON file. Please ensure it is valid JSON.",
        );
        setIsUploading(false);
        return;
      }

      // Validate that at least one section has data
      if (
        !payload.categories?.length &&
        !payload.bank_accounts?.length &&
        !payload.tags?.length &&
        !payload.transactions?.length
      ) {
        setFileError(
          "JSON must contain at least one of: categories, bank_accounts, tags, or transactions.",
        );
        setIsUploading(false);
        return;
      }

      // Call new DataApi RPC method
      const res = await DataApi.bulkUploadData(payload);

      setResult(res as BulkUploadResult);
      setFile(null);
      clearFileInput();
    } catch (err: unknown) {
      // Prefer the typed RpcError with structured details
      if (err instanceof RpcError) {
        // If we have structured error details, show those
        if (err.details && err.details.length > 0) {
          setErrors(err.details);
        } else {
          // Otherwise show the main error message
          setFileError(err.message);
        }
      } else if (err instanceof Error) {
        setFileError(err.message);
      } else {
        setFileError(String(err));
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-3">Bulk Upload</h3>

      <p className="text-sm text-gray-600 mb-4">
        Upload a JSON file containing categories, bank accounts, tags, and/or
        transactions. Max file size: 1MB.
      </p>

      <div className="space-y-3">
        <div>
          <input
            id="bulk-upload-input"
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className=""
            aria-label="Select JSON file with entities and transactions"
            data-testid="bulk-upload-input"
          />
        </div>

        {file && (
          <div className="text-sm text-gray-700">
            Selected file: <strong>{file.name}</strong> (
            {Math.round(file.size / 1024)} KB)
          </div>
        )}

        {file && preview && !fileError && (
          <div
            className="text-sm text-blue-700 bg-blue-50 p-2 rounded"
            data-testid="bulk-upload-preview"
          >
            Preview: {preview}
          </div>
        )}

        {fileError && (
          <div
            className="text-sm text-red-600"
            data-testid="bulk-upload-file-error"
          >
            {fileError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={isUploading || !file}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60`}
            data-testid="bulk-upload-submit"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>

          <button
            onClick={() => {
              setFile(null);
              setFileError(null);
              setResult(null);
              setErrors([]);
              setPreview(null);
              clearFileInput();
            }}
            className="px-3 py-2 border rounded text-sm"
            data-testid="bulk-upload-clear"
          >
            Clear
          </button>
        </div>

        {/* Task 3.4: Success message with detailed counts */}
        {result?.success && (
          <div
            className="mt-4 p-3 bg-green-50 border border-green-200 rounded"
            data-testid="bulk-upload-success"
          >
            <div className="text-sm text-green-800 font-medium mb-1">
              Upload Successful ✓
            </div>
            <ul className="text-sm text-green-700 space-y-1">
              {result.categories_inserted ? (
                <li data-testid="bulk-upload-categories-count">
                  • {result.categories_inserted} categories inserted
                </li>
              ) : null}
              {result.bank_accounts_inserted ? (
                <li data-testid="bulk-upload-bank-accounts-count">
                  • {result.bank_accounts_inserted} bank accounts inserted
                </li>
              ) : null}
              {result.tags_inserted ? (
                <li data-testid="bulk-upload-tags-count">
                  • {result.tags_inserted} tags inserted
                </li>
              ) : null}
              {result.transactions_inserted ? (
                <li data-testid="bulk-upload-transactions-count">
                  • {result.transactions_inserted} transactions inserted
                </li>
              ) : null}
              {!result.categories_inserted &&
                !result.bank_accounts_inserted &&
                !result.tags_inserted &&
                !result.transactions_inserted && (
                  <li>• No new data inserted (all items may already exist)</li>
                )}
            </ul>
          </div>
        )}

        {/* Task 3.4: Error display with detailed messages */}
        {!result?.success && result && (
          <div
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded"
            data-testid="bulk-upload-error"
          >
            <div className="text-sm text-red-800 font-medium mb-2">
              Upload Failed
            </div>
            <div className="text-sm text-red-700">
              {result.error || "An unknown error occurred"}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded max-h-56 overflow-auto">
            <div className="text-sm text-red-800 font-medium mb-2">
              Detailed Errors ({errors.length})
            </div>
            <ul className="list-decimal pl-5 space-y-1 text-sm text-red-700">
              {errors.map((e) => (
                <li key={e.index}>
                  Row {e.index}: {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-4 text-sm text-gray-700">
          <summary className="cursor-pointer font-medium">
            Example format
          </summary>
          <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-auto">
            {`{
  "categories": [
    {
      "type": "spend",
      "name": "Groceries",
      "description": "Food shopping"
    },
    {
      "type": "spend",
      "name": "Transport",
      "description": null
    }
  ],
  "bank_accounts": [
    {
      "name": "Monzo",
      "description": "Main current account"
    }
  ],
  "tags": [
    {
      "name": "essentials",
      "description": "Essential expenses"
    },
    {
      "name": "weekly",
      "description": null
    }
  ],
  "transactions": [
    {
      "date": "2025-10-15",
      "type": "spend",
      "category": "Groceries",
      "bank_account": "Monzo",
      "amount": 45.67,
      "tags": ["essentials", "weekly"],
      "notes": "Weekly shopping"
    },
    {
      "date": "2025-10-16",
      "type": "earn",
      "category": "Salary",
      "amount": 3000.00
    }
  ]
}`}
          </pre>
          <div className="mt-3 space-y-2 text-gray-600 text-xs">
            <p>
              <strong>All sections optional:</strong> categories, bank_accounts,
              tags, transactions
            </p>
            <p>
              <strong>Category fields:</strong> type (required:
              earn/spend/save), name (required), description (optional)
            </p>
            <p>
              <strong>Bank Account & Tag fields:</strong> name (required),
              description (optional)
            </p>
            <p>
              <strong>Transaction fields:</strong> date (required: YYYY-MM-DD),
              type (required: earn/spend/save), amount (required), category
              (optional), bank_account (optional), tags (optional array), notes
              (optional)
            </p>
            <p className="text-blue-600 font-medium">
              Duplicates are skipped (idempotent). Upload the same file twice
              with no errors.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
