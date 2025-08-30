import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <section className="border rounded p-4">
        <h2 className="text-lg font-medium mb-2">Manage</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <Link href="/settings/categories" className="text-blue-600 hover:underline">
              Categories
            </Link>
          </li>
          <li>
            <Link href="/settings/tags" className="text-blue-600 hover:underline">
              Tags
            </Link>
          </li>
          <li>
            <Link href="/settings/bank-accounts" className="text-blue-600 hover:underline">
              Bank Accounts
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
