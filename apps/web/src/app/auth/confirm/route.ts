import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@utils/supabase/server";

/**
 * Exchanges a token hash (from email templates) for an authenticated session.
 * Supports types: magiclink, recovery, email, signup
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const type = (searchParams.get("type") as EmailOtpType | null) ?? null;
    const next = searchParams.get("next") ?? "/dashboard";

    // Validate required parameters
    if (!token_hash || !type) {
      console.error("Missing required parameters for /auth/confirm", {
        has_token: !!token_hash,
        has_type: !!type,
      });
      return NextResponse.redirect(
        new URL("/auth/auth-code-error", request.url),
      );
    }

    const supabase = createSupabaseServerClient();

    // Exchange token hash for session (PKCE / otp verification)
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    } as any);

    if (error) {
      console.error("Token verification error in /auth/confirm", error);
      const redirectUrl = new URL(
        `/auth/auth-code-error?error=${encodeURIComponent(error.message)}`,
        request.url,
      );
      return NextResponse.redirect(redirectUrl);
    }

    if (!data?.session) {
      console.error("No session returned after token verification");
      return NextResponse.redirect(
        new URL("/auth/auth-code-error", request.url),
      );
    }

    // Success — redirect to `next`
    const redirectTo = new URL(next, request.url);
    return NextResponse.redirect(redirectTo);
  } catch (err: any) {
    console.error("Unexpected error in /auth/confirm", err);
    const redirectUrl = new URL(
      `/auth/auth-code-error?error=${encodeURIComponent(err?.message ?? "Unexpected error")}`,
      request.url,
    );
    return NextResponse.redirect(redirectUrl);
  }
}
