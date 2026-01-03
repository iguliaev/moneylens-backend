"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect } from "react";

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Limit displayed error length to avoid layout issues
  const MAX_ERROR_LEN = 300;
  const defaultMessage = "The authentication link is invalid or has expired.";
  const rawMessage = error ?? null;
  const displayError = rawMessage
    ? rawMessage.length > MAX_ERROR_LEN
      ? rawMessage.slice(0, MAX_ERROR_LEN) + "…"
      : rawMessage
    : defaultMessage;

  useEffect(() => {
    const el = document.getElementById("auth-error-heading");
    if (el) el.focus();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              aria-hidden="true"
              className="h-6 w-6 text-red-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1
            id="auth-error-heading"
            tabIndex={-1}
            className="mt-4 text-2xl font-bold text-gray-900"
          >
            Authentication Error
          </h1>
          <p
            role="alert"
            aria-live="polite"
            className="mt-2 text-sm text-gray-600"
          >
            {displayError}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Login
          </Link>
          <Link
            href="/forgot-password"
            className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Request New Link
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthCodeError() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
