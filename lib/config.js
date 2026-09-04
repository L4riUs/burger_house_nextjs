export const ALLOW_NEGATIVE_STOCK = false; // TODO(fase-config): mover a tabla settings

// Cuándo se pide la verificación de pago en POS para métodos NO efectivo.
// 'before' = bloquear creación de la orden hasta capturar el comprobante.
// 'after'  = crear la orden y capturar el comprobante después.
// TODO(fase-config): mover a tabla settings
export const POS_PAYMENT_VERIFICATION = 'after';

export const DEFAULT_CURRENCY = 'VES';

export const DEFAULT_EXCHANGE_RATE = 1; // placeholder, se usa BCV en producción

export const PAGE_SIZES = {
  default: 20,
  max: 100,
};

export const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB