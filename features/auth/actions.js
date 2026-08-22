"use server";

import { createClient } from "@/lib/supabase/server";

export async function signIn(formData) {
  const supabase = await createClient();

  const data = {
    email: formData.email,
    password: formData.password,
  };

  const { data: authData, error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  // Determinar a dónde redirigir según el rol del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  const STAFF_ROLES = ["owner", "admin", "cajero", "mesero", "cocina", "delivery"];
  const redirectTo =
    profile && STAFF_ROLES.includes(profile.role) ? "/admin" : "/";

  return { redirectTo };
}

export async function signUp(formData) {
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        full_name: formData.full_name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (authData.user && !authData.session) {
    return { success: "Revisa tu correo para confirmar tu cuenta" };
  }

  // Usuario confirmado automáticamente (email confirm desactivado en Supabase)
  return { redirectTo: "/" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // signOut sí puede usar redirect() ya que es una acción unidireccional
  // sin valor de retorno esperado por el cliente
  const { redirect } = await import("next/navigation");
  redirect("/login");
}

export async function requestPasswordReset(formData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?redirect_to=${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Revisa tu correo para restablecer tu contraseña" };
}

export async function updatePassword(formData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Contraseña actualizada correctamente" };
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}
