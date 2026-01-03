import { AuthPage } from "@components/auth-page";
import { authProviderServer } from "@providers/auth-provider/auth-provider.server";
import { redirect } from "next/navigation";

export default async function UpdatePassword() {
  const data = await getData();

  // User must be authenticated to update password
  if (!data.authenticated) {
    redirect("/login");
  }

  return <AuthPage type="updatePassword" />;
}

async function getData() {
  const { authenticated, redirectTo, error } = await authProviderServer.check();

  return {
    authenticated,
    redirectTo,
    error,
  };
}
