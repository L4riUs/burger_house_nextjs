"use server";

import { createClient } from "@/lib/supabase/server";
import { exportReportSchema } from "./schemas";
import { formatISO } from "date-fns";

function getDateRange(preset, dateFrom, dateTo) {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { from: formatISO(startOfDay), to: formatISO(endOfDay) };
    case "yesterday": {
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(endOfDay);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      return { from: formatISO(yesterday), to: formatISO(yesterdayEnd) };
    }
    case "last_7_days": {
      const sevenDaysAgo = new Date(startOfDay);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return { from: formatISO(sevenDaysAgo), to: formatISO(endOfDay) };
    }
    case "last_30_days": {
      const thirtyDaysAgo = new Date(startOfDay);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { from: formatISO(thirtyDaysAgo), to: formatISO(endOfDay) };
    }
    case "this_month": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatISO(firstDay), to: formatISO(endOfDay) };
    }
    case "last_month": {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      lastDayLastMonth.setHours(23, 59, 59, 999);
      return { from: formatISO(firstDayLastMonth), to: formatISO(lastDayLastMonth) };
    }
    case "custom":
    default:
      return {
        from: dateFrom || formatISO(new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000)),
        to: dateTo || formatISO(endOfDay),
      };
  }
}

async function requireStaffRole(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin", "cajero"].includes(profile.role)) {
    return { error: "No tienes permisos para exportar reportes" };
  }

  return { user, role: profile.role };
}

export async function exportReport(params) {
  const supabase = await createClient();
  const authResult = await requireStaffRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const parsed = exportReportSchema.safeParse(params);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { report_type, format, preset, date_from, date_to, item_type, txn_type } = parsed.data;
  const { from, to } = getDateRange(preset, date_from, date_to);

  try {
    let data;
    let filename;

    switch (report_type) {
      case "sales": {
        const result = await supabase.rpc("get_sales_report", {
          p_date_from: from,
          p_date_to: to,
          p_page: 1,
          p_page_size: 50000,
        });
        data = result.data || [];
        filename = `ventas_${from.split("T")[0]}_${to.split("T")[0]}.${format}`;
        break;
      }
      case "inventory": {
        const result = await supabase.rpc("get_inventory_report", {
          p_item_type: item_type,
          p_date_from: from,
          p_date_to: to,
          p_page: 1,
          p_page_size: 50000,
        });
        data = result.data || [];
        filename = `inventario_${from.split("T")[0]}_${to.split("T")[0]}.${format}`;
        break;
      }
      case "cash": {
        const result = await supabase.rpc("get_cash_report", {
          p_txn_type: txn_type,
          p_date_from: from,
          p_date_to: to,
          p_page: 1,
          p_page_size: 50000,
        });
        data = result.data || [];
        filename = `caja_${from.split("T")[0]}_${to.split("T")[0]}.${format}`;
        break;
      }
      default:
        return { error: "Tipo de reporte inválido" };
    }

    return { data, filename, date_range: { from, to }, format };
  } catch (err) {
    console.error("[exportReport] Error:", err);
    return { error: err.message };
  }
}