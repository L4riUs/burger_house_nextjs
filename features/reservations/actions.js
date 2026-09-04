"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reservationSchema } from "./schemas";
import { getReservationOverlapMessage } from "./errors";

const PAGE_SIZE = 20;

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "No autenticado" };
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, role: profile?.role, error: null };
}

export async function listReservations({
  page = 1,
  pageSize = PAGE_SIZE,
  search,
  status,
  date_from,
  date_to,
} = {}) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const { supabase, role } = auth;

  if (!["owner","admin","cajero","mesero"].includes(role)) {
    return { error: "No tienes permisos" };
  }

  let query = supabase
    .from("reservations")
    .select(
      "*, profile:profiles(id, full_name, phone), guest_customer:guest_customers(id, full_name, phone, address), table:restaurant_tables(id, name, capacity), package:reservation_packages(id, name, capacity)",
      { count: "exact" }
    );

  if (search) {
    query = query.or(
      `profiles.full_name.ilike.%${search}%,profiles.phone.ilike.%${search}%,guest_customers.full_name.ilike.%${search}%,guest_customers.phone.ilike.%${search}%,notes.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (date_from) query = query.gte("reserved_at", date_from);
  if (date_to) {
    const end = new Date(date_to);
    end.setDate(end.getDate() + 1);
    query = query.lt("reserved_at", end.toISOString());
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("reserved_at", { ascending: false })
    .range(from, to);

  if (error) return { error: error.message };

  const dataWithNames = (data || []).map((r) => ({
    ...r,
    customer_name: r.profile?.full_name || r.guest_customer?.full_name || "Cliente",
    package_name: r.package?.name || null,
  }));

  return {
    data: dataWithNames,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function getReservation(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("reservations")
    .select(
      "*, profile:profiles(id, full_name, phone), guest_customer:guest_customers(id, full_name, phone, address), table:restaurant_tables(id, name, capacity), package:reservation_packages(id, name, capacity)"
    )
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createReservation(formData) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin","cajero","mesero"].includes(auth.role)) {
    return { error: "No tienes permisos" };
  }

  const parsed = reservationSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const insertData = {
    party_size: d.party_size,
    reserved_at: d.reserved_at,
    duration_minutes: d.duration_minutes,
    status: d.status,
    notes: d.notes,
    table_id: d.table_id || null,
    package_id: d.package_id || null,
  };

  if (d.customer_type === "authenticated") {
    insertData.profile_id = d.profile_id;
    insertData.guest_customer_id = null;
  } else {
    insertData.profile_id = null;
    insertData.guest_customer_id = d.guest_customer_id;
  }

  const { data, error } = await auth.supabase
    .from("reservations")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    const overlapMsg = getReservationOverlapMessage(error);
    if (overlapMsg) return { error: overlapMsg };
    return { error: error.message };
  }

  revalidatePath("/admin/reservas");
  return { data, success: "Reservación creada correctamente" };
}

export async function updateReservation(id, formData) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin","cajero","mesero"].includes(auth.role)) {
    return { error: "No tienes permisos" };
  }

  const parsed = reservationSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const updateData = {
    party_size: d.party_size,
    reserved_at: d.reserved_at,
    duration_minutes: d.duration_minutes,
    status: d.status,
    notes: d.notes,
    table_id: d.table_id || null,
    package_id: d.package_id || null,
  };

  if (d.customer_type === "authenticated") {
    updateData.profile_id = d.profile_id;
    updateData.guest_customer_id = null;
  } else {
    updateData.profile_id = null;
    updateData.guest_customer_id = d.guest_customer_id;
  }

  const { data, error } = await auth.supabase
    .from("reservations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const overlapMsg = getReservationOverlapMessage(error);
    if (overlapMsg) return { error: overlapMsg };
    return { error: error.message };
  }

  revalidatePath("/admin/reservas");
  return { data, success: "Reservación actualizada correctamente" };
}

export async function seatReservation(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin","cajero","mesero"].includes(auth.role)) {
    return { error: "No tienes permisos" };
  }

  const { error } = await auth.supabase
    .from("reservations")
    .update({ status: "seated" })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/reservas");
  return { success: "Reservación sentada correctamente" };
}

export async function cancelReservation(id) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin","cajero","mesero"].includes(auth.role)) {
    return { error: "No tienes permisos" };
  }

  const { error } = await auth.supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/reservas");
  return { success: "Reservación cancelada correctamente" };
}

export async function listClientsForReservations() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "cliente")
    .order("full_name");

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function listGuestsForReservations() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("guest_customers")
    .select("id, full_name, phone, address")
    .is("deleted_at", null)
    .order("full_name");

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function listTablesForReservations() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("restaurant_tables")
    .select("id, name, capacity, status")
    .is("deleted_at", null)
    .eq("status", "available")
    .order("name");

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function listPackagesForReservations() {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from("reservation_packages")
    .select("id, name, capacity, price_usd")
    .is("deleted_at", null)
    .order("name");

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createGuestForReservation({ full_name, phone, address }) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  if (!["owner","admin","cajero","mesero"].includes(auth.role)) {
    return { error: "No tienes permisos" };
  }

  const { data, error } = await auth.supabase
    .from("guest_customers")
    .insert({ full_name, phone, address })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, success: "Cliente registrado" };
}
