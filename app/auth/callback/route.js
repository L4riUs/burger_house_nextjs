import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value) {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/reset-password";
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(`${nextPath}?error=recovery_code_missing`, requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`${nextPath}?error=recovery_code_invalid`, requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}