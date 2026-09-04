export const CURRENCY_LABELS = {
  VES: "Bolívares (VES)",
  USD: "Dólares (USD)",
};

export const TXN_TYPE_LABELS = {
  sale: "Venta",
  expense: "Gasto",
  capital_in: "Aporte de capital",
  capital_out: "Retiro de capital",
  supplier_payment: "Pago a proveedor",
};

export const TXN_TYPE_VARIANT = {
  sale: "default",
  expense: "destructive",
  capital_in: "default",
  capital_out: "destructive",
  supplier_payment: "secondary",
};

export const INVOICE_TYPE_LABELS = {
  invoice: "Factura",
  credit_note: "Nota de Crédito",
};

export function formatCurrency(amount, currency = "VES") {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount) {
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
