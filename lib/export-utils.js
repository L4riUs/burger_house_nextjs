export function arrayToCSV(data, columns) {
  if (!data || data.length === 0) return "";

  const headers = columns.map((c) => c.header).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key];
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
}

export function downloadCSV(csvContent, filename) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatCSVValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toFixed(2);
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value);
}

export const SALES_REPORT_COLUMNS = [
  { key: "order_number", header: "N° Orden" },
  { key: "created_at", header: "Fecha" },
  { key: "channel", header: "Canal" },
  { key: "fulfillment_type", header: "Tipo Entrega" },
  { key: "status", header: "Estado" },
  { key: "customer_name", header: "Cliente" },
  { key: "total_ves", header: "Total VES" },
  { key: "total_usd", header: "Total USD" },
  { key: "currency", header: "Moneda" },
  { key: "exchange_rate", header: "Tasa Cambio" },
  { key: "payment_method_name", header: "Método Pago" },
];

export const INVENTORY_REPORT_COLUMNS = [
  { key: "item_type", header: "Tipo Ítem" },
  { key: "item_name", header: "Nombre" },
  { key: "movement_type", header: "Tipo Movimiento" },
  { key: "quantity", header: "Cantidad" },
  { key: "unit_cost", header: "Costo Unit." },
  { key: "unit_abbreviation", header: "Unidad" },
  { key: "supplier_name", header: "Proveedor" },
  { key: "performed_by_name", header: "Responsable" },
  { key: "created_at", header: "Fecha" },
  { key: "note", header: "Nota" },
];

export const CASH_REPORT_COLUMNS = [
  { key: "txn_type", header: "Tipo Transacción" },
  { key: "currency", header: "Moneda" },
  { key: "amount", header: "Monto" },
  { key: "exchange_rate", header: "Tasa Cambio" },
  { key: "description", header: "Descripción" },
  { key: "performed_by_name", header: "Responsable" },
  { key: "session_opened_at", header: "Sesión Apertura" },
  { key: "order_number", header: "N° Orden" },
  { key: "supplier_name", header: "Proveedor" },
  { key: "created_at", header: "Fecha" },
];

export function formatReportData(reportType, data) {
  switch (reportType) {
    case "sales":
      return data.map((row) => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at).toLocaleString("es-VE") : "",
        total_ves: formatReportDataNumber(row.total_ves),
        total_usd: formatReportDataNumber(row.total_usd),
        exchange_rate: formatReportDataNumber(row.exchange_rate, 4),
      }));
    case "inventory":
      return data.map((row) => ({
        ...row,
        item_type: row.item_type === "raw_material" ? "Materia Prima" : "Producto",
        created_at: row.created_at ? new Date(row.created_at).toLocaleString("es-VE") : "",
        quantity: formatReportDataNumber(row.quantity),
        unit_cost: formatReportDataNumber(row.unit_cost, 4),
      }));
    case "cash":
      return data.map((row) => ({
        ...row,
        txn_type: formatTxnType(row.txn_type),
        created_at: row.created_at ? new Date(row.created_at).toLocaleString("es-VE") : "",
        session_opened_at: row.session_opened_at ? new Date(row.session_opened_at).toLocaleString("es-VE") : "",
        amount: formatReportDataNumber(row.amount),
        exchange_rate: formatReportDataNumber(row.exchange_rate, 4),
      }));
    default:
      return data;
  }
}

function formatReportDataNumber(value, decimals = 2) {
  if (value === null || value === undefined) return "";
  return Number(value).toFixed(decimals);
}

function formatTxnType(type) {
  const labels = {
    sale: "Venta",
    expense: "Gasto",
    capital_in: "Aporte Capital",
    capital_out: "Retiro Capital",
    supplier_payment: "Pago Proveedor",
  };
  return labels[type] || type;
}