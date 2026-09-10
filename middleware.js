import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const STAFF_ROLES = ["owner", "admin", "cajero", "mesero", "cocina", "delivery"];

// Cliente con service role para leer profiles sin restricciones RLS
// Solo se usa DESPUÉS de verificar la identidad del usuario vía JWT
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getProfileRole(userId) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role ?? null;
}

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isResetPasswordPage = pathname.startsWith("/reset-password");

  const isAdminRoute = pathname.startsWith("/admin");

  // 1. Rutas de admin: requieren autenticación y rol de staff
  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const role = await getProfileRole(user.id);

    if (!role || !STAFF_ROLES.includes(role)) {
      // Cliente intentando acceder a admin → manda a la tienda
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // 2. Páginas de auth: redirigir usuarios ya autenticados a su destino
  if (user && isAuthPage && !isResetPasswordPage) {
    const role = await getProfileRole(user.id);

    const url = request.nextUrl.clone();
    if (role && STAFF_ROLES.includes(role)) {
      url.pathname = "/admin";
    } else {
      url.pathname = "/";
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
