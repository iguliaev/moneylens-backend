import { AuthPage } from "@components/auth-page";
import { MagicLinkForm } from "@components/auth-page/magic-link-form";
import { authProviderServer } from "@providers/auth-provider/auth-provider.server";
import { redirect } from "next/navigation";

export default async function Login() {
  const data = await getData();

  if (data.authenticated) {
    redirect(data?.redirectTo || "/");
  }

  return (
    <div className="space-y-6">
      {/* Existing password-based login */}
      <AuthPage type="login" />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Or</span>
        </div>
      </div>

      {/* Magic Link Login */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Login with Magic Link
        </h2>
        <MagicLinkForm />
      </div>
    </div>
  );
}

async function getData() {
  const { authenticated, redirectTo, error } = await authProviderServer.check();

  return {
    authenticated,
    redirectTo,
    error,
  };
}
