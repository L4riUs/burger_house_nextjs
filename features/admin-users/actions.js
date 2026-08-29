"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAssignRole, isOwnerOrAdmin } from "@/features/auth/role-logic";
import { changeRoleSchema } from "./schemas";

export async function listProfiles({ page = 1, pageSize = 10, role, search } = {}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !isOwnerOrAdmin(actorProfile.role)) {
    return { error: "No tienes permisos para ver esta información" };
  }

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" });

  if (role) {
    query = query.eq("role", role);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { error: error.message };
  }

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function changeUserRole(userId, newRole) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!actorProfile || !isOwnerOrAdmin(actorProfile.role)) {
    return { error: "No tienes permisos para cambiar roles" };
  }

  const parsed = changeRoleSchema.safeParse({ userId, newRole });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (!canAssignRole(actorProfile.role, newRole)) {
    return {
      error: `No puedes asignar el rol "${newRole}". Un ${actorProfile.role} solo puede asignar roles específicos.`,
    };
  }

  const { data: targetProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .single();

  if (fetchError || !targetProfile) {
    return { error: "Usuario no encontrado" };
  }

  if (targetProfile.role === "owner" && actorProfile.role !== "owner") {
    return { error: "Solo un propietario puede cambiar el rol de otro propietario" };
  }

  const adminClient = createAdminClient();

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin/users");
  return { success: `Rol de ${targetProfile.full_name} cambiado a ${newRole}` };
}
