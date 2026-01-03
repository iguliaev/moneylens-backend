"use client";

import { useState, useEffect } from "react";

interface DataResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function DataResetModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DataResetModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isConfirmed = confirmText === "DELETE";

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText("");
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!isConfirmed || isLoading) return;

    setError(null);
    try {
      await onConfirm();
      setConfirmText("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during data reset",
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isConfirmed && !isLoading) {
      handleConfirm();
    } else if (e.key === "Escape" && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto"
          role="alertdialog"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div className="p-6 space-y-4">
            {/* Header */}
            <h2
              id="modal-title"
              className="text-xl font-semibold text-red-600 flex items-center gap-2"
            >
              <span className="text-2xl">⚠️</span>
              Reset All Data
            </h2>

            {/* Description */}
            <div
              id="modal-description"
              className="space-y-3 text-sm text-gray-700"
            >
              <p>
                This action will{" "}
                <span className="font-semibold text-red-600">
                  permanently delete
                </span>
                :
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-gray-600">
                <li>All transactions (earn, spend, save)</li>
                <li>All categories</li>
                <li>All tags</li>
                <li>All bank accounts</li>
              </ul>
              <p className="text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
                This action cannot be undone!
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <label
                htmlFor="confirm-input"
                className="block text-sm font-medium"
              >
                Type{" "}
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-semibold">
                  DELETE
                </span>{" "}
                to confirm:
              </label>
              <input
                id="confirm-input"
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="DELETE"
                disabled={isLoading}
                autoFocus
                maxLength={10}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                data-testid="data-reset-confirm-input"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="data-reset-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isConfirmed || isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                data-testid="data-reset-confirm"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Everything"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
