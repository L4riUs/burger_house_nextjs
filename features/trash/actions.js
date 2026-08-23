"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ENTITIES = [
  { table: "categories", label: "Categorías", nameField: "name->>es" },
  { table: "units", label: "Unidades", nameField: "name" },
  { table: "raw_materials", label: "Materias Primas", nameField: "name" },
];

export async function listTrash() {
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

  if (!actorProfile || !["owner", "admin"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para ver la papelera" };
  }

  const results = await Promise.all(
    ENTITIES.map(async (entity) => {
      const { data, error } = await supabase
        .from(entity.table)
        .select("id, name, deleted_at, created_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) {
        return { entity: entity.table, label: entity.label, data: [], error: error.message };
      }

      return {
        entity: entity.table,
        label: entity.label,
        data: (data || []).map(item => ({
          ...item,
          displayName: typeof item.name === 'object' ? (item.name?.es || item.name?.en || 'Sin nombre') : item.name,
        })),
      };
    })
  );

  return { data: results };
}

export async function restoreItem(entity, id) {
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

  if (!actorProfile || !["owner", "admin"].includes(actorProfile.role)) {
    return { error: "No tienes permisos para restaurar elementos" };
  }

  const entityConfig = ENTITIES.find(e => e.table === entity);
  if (!entityConfig) {
    return { error: "Entidad no válida" };
  }

  const { error } = await supabase
    .from(entity)
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/papelera");
  revalidatePath(`/admin/inventario/${entity === "categories" ? "categorias" : entity === "units" ? "unidades" : "materias-primas"}`);

  return { success: `${entityConfig.label.slice(0, -1)} restaurada correctamente` };
}