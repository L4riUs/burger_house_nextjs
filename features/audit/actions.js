"use server";

import { createClient } from "@/lib/supabase/server";
import { auditFiltersSchema } from "./schemas";

async function requireAdminRole(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return { error: "Solo owner/admin pueden ver la auditoría" };
  }

  return { user, role: profile.role };
}

export async function listAuditLogs(filters = {}) {
  const supabase = await createClient();
  const authResult = await requireAdminRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const parsed = auditFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { page, pageSize, entity, actor_id, action, date_from, date_to } = parsed.data;

  let query = supabase
    .from("audit_log")
    .select(`
      *,
      actor:profiles!audit_log_actor_id_fkey(id, full_name, role)
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  if (entity) {
    query = query.eq("entity", entity);
  }

  if (actor_id) {
    query = query.eq("actor_id", actor_id);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (date_from) {
    query = query.gte("created_at", date_from);
  }

  if (date_to) {
    query = query.lte("created_at", date_to);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { error: error.message };
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function getAuditEntities() {
  const supabase = await createClient();
  const authResult = await requireAdminRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const { data, error } = await supabase
    .from("audit_log")
    .select("entity")
    .order("entity");

  if (error) return { error: error.message };

  const entities = [...new Set(data?.map((d) => d.entity) || [])].sort();
  return { data: entities };
}

export async function getAuditActors() {
  const supabase = await createClient();
  const authResult = await requireAdminRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const { data, error } = await supabase
    .from("audit_log")
    .select("actor_id, actor:profiles!audit_log_actor_id_fkey(id, full_name, role)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { error: error.message };

  const actorsMap = new Map();
  data?.forEach((d) => {
    if (d.actor_id && !actorsMap.has(d.actor_id)) {
      actorsMap.set(d.actor_id, d.actor);
    }
  });

  const actors = Array.from(actorsMap.entries()).map(([id, actor]) => ({
    id,
    full_name: actor?.full_name || "Desconocido",
    role: actor?.role || "—",
  }));

  return { data: actors };
}

export async function getAuditActions() {
  const supabase = await createClient();
  const authResult = await requireAdminRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const { data, error } = await supabase
    .from("audit_log")
    .select("action")
    .order("action");

  if (error) return { error: error.message };

  const actions = [...new Set(data?.map((d) => d.action) || [])].sort();
  return { data: actions };
}