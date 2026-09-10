"use server";

import { createClient } from "@/lib/supabase/server";
import { dashboardFiltersSchema } from "./schemas";
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
    return { error: "No tienes permisos para ver el dashboard" };
  }

  return { user, role: profile.role };
}

export async function getDashboardKPIs(filters = {}) {
  const supabase = await createClient();
  const authResult = await requireStaffRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const parsed = dashboardFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { preset, date_from, date_to } = parsed.data;
  const { from, to } = getDateRange(preset, date_from, date_to);

  try {
    const [
      salesKPIs,
      ordersByStatus,
      topProducts,
      topCombos,
      cashStatus,
      lowStockAlerts,
      salesByChannel,
      salesByFulfillment,
    ] = await Promise.all([
      supabase.rpc("get_sales_kpis", { p_date_from: from, p_date_to: to }),
      supabase.rpc("get_orders_by_status", { p_date_from: from, p_date_to: to }),
      supabase.rpc("get_top_products_sold", { p_limit: 10, p_date_from: from, p_date_to: to }),
      supabase.rpc("get_top_combos_sold", { p_limit: 5, p_date_from: from, p_date_to: to }),
      supabase.rpc("get_cash_session_status"),
      supabase.rpc("get_low_stock_alerts"),
      supabase.rpc("get_sales_by_channel", { p_date_from: from, p_date_to: to }),
      supabase.rpc("get_sales_by_fulfillment", { p_date_from: from, p_date_to: to }),
    ]);

    return {
      data: {
        sales: salesKPIs.data?.[0] || {
          total_ves: 0,
          total_usd: 0,
          orders_count: 0,
          avg_ticket_ves: 0,
          avg_ticket_usd: 0,
        },
        orders_by_status: ordersByStatus.data || [],
        top_products: topProducts.data || [],
        top_combos: topCombos.data || [],
        cash_session: cashStatus.data?.[0] || null,
        low_stock_alerts: lowStockAlerts.data || [],
        sales_by_channel: salesByChannel.data || [],
        sales_by_fulfillment: salesByFulfillment.data || [],
        date_range: { from, to },
      },
    };
  } catch (err) {
    console.error("[getDashboardKPIs] Error:", err);
    return { error: err.message };
  }
}

export async function getSalesReport(filters = {}, page = 1, pageSize = 50) {
  const supabase = await createClient();
  const authResult = await requireStaffRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const parsed = dashboardFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { preset, date_from, date_to } = parsed.data;
  const { from, to } = getDateRange(preset, date_from, date_to);

  try {
    const [dataResult, countResult] = await Promise.all([
      supabase.rpc("get_sales_report", {
        p_date_from: from,
        p_date_to: to,
        p_page: page,
        p_page_size: pageSize,
      }),
      supabase.rpc("count_sales_report", { p_date_from: from, p_date_to: to }),
    ]);

    return {
      data: dataResult.data || [],
      pagination: {
        page,
        pageSize,
        total: countResult.data || 0,
        totalPages: Math.ceil((countResult.data || 0) / pageSize),
      },
    };
  } catch (err) {
    console.error("[getSalesReport] Error:", err);
    return { error: err.message };
  }
}

export async function getInventoryReport(filters = {}, page = 1, pageSize = 50) {
  const supabase = await createClient();
  const authResult = await requireStaffRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const parsed = dashboardFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { preset, date_from, date_to, item_type } = parsed.data;
  const { from, to } = getDateRange(preset, date_from, date_to);

  try {
    const [dataResult, countResult] = await Promise.all([
      supabase.rpc("get_inventory_report", {
        p_item_type: item_type,
        p_date_from: from,
        p_date_to: to,
        p_page: page,
        p_page_size: pageSize,
      }),
      supabase.rpc("count_inventory_report", {
        p_item_type: item_type,
        p_date_from: from,
        p_date_to: to,
      }),
    ]);

    return {
      data: dataResult.data || [],
      pagination: {
        page,
        pageSize,
        total: countResult.data || 0,
        totalPages: Math.ceil((countResult.data || 0) / pageSize),
      },
    };
  } catch (err) {
    console.error("[getInventoryReport] Error:", err);
    return { error: err.message };
  }
}

export async function getCashReport(filters = {}, page = 1, pageSize = 50) {
  const supabase = await createClient();
  const authResult = await requireStaffRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const parsed = dashboardFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { preset, date_from, date_to, txn_type } = parsed.data;
  const { from, to } = getDateRange(preset, date_from, date_to);

  try {
    const [dataResult, countResult] = await Promise.all([
      supabase.rpc("get_cash_report", {
        p_txn_type: txn_type,
        p_date_from: from,
        p_date_to: to,
        p_page: page,
        p_page_size: pageSize,
      }),
      supabase.rpc("count_cash_report", {
        p_txn_type: txn_type,
        p_date_from: from,
        p_date_to: to,
      }),
    ]);

    return {
      data: dataResult.data || [],
      pagination: {
        page,
        pageSize,
        total: countResult.data || 0,
        totalPages: Math.ceil((countResult.data || 0) / pageSize),
      },
    };
  } catch (err) {
    console.error("[getCashReport] Error:", err);
    return { error: err.message };
  }
}

export async function exportReportData(reportType, filters = {}) {
  const supabase = await createClient();
  const authResult = await requireStaffRole(supabase);
  if (authResult.error) return { error: authResult.error };

  const parsed = dashboardFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { preset, date_from, date_to, item_type, txn_type } = parsed.data;
  const { from, to } = getDateRange(preset, date_from, date_to);

  try {
    let data;
    let filename;

    switch (reportType) {
      case "sales": {
        const result = await supabase.rpc("get_sales_report", {
          p_date_from: from,
          p_date_to: to,
          p_page: 1,
          p_page_size: 10000,
        });
        data = result.data || [];
        filename = `ventas_${from.split("T")[0]}_${to.split("T")[0]}.csv`;
        break;
      }
      case "inventory": {
        const result = await supabase.rpc("get_inventory_report", {
          p_item_type: item_type,
          p_date_from: from,
          p_date_to: to,
          p_page: 1,
          p_page_size: 10000,
        });
        data = result.data || [];
        filename = `inventario_${from.split("T")[0]}_${to.split("T")[0]}.csv`;
        break;
      }
      case "cash": {
        const result = await supabase.rpc("get_cash_report", {
          p_txn_type: txn_type,
          p_date_from: from,
          p_date_to: to,
          p_page: 1,
          p_page_size: 10000,
        });
        data = result.data || [];
        filename = `caja_${from.split("T")[0]}_${to.split("T")[0]}.csv`;
        break;
      }
      default:
        return { error: "Tipo de reporte inválido" };
    }

    return { data, filename, date_range: { from, to } };
  } catch (err) {
    console.error("[exportReportData] Error:", err);
    return { error: err.message };
  }
}