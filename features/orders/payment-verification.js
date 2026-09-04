// Reglas de verificación de pago para POS.
// Un método de pago en EFECTIVO (Bs o USD) tiene provider_code NULL → no exige
// comprobante. El resto (Pago Móvil, Binance, Zelle, tarjeta, etc.) exige
// comprobante con foto adjunta (igual que el storefront).

export function isCashPaymentMethod(paymentMethod) {
  if (!paymentMethod) return false;
  // En efectivo no hay adaptador de pasarela (provider_code NULL).
  return paymentMethod.provider_code === null || paymentMethod.provider_code === undefined;
}

export function requiresPaymentProof(paymentMethod) {
  if (!paymentMethod) return false;
  return !isCashPaymentMethod(paymentMethod);
}

// Un comprobante es válido para crear/procesar la orden cuando tiene la
// referencia y todos los campos exigidos según el tipo de proveedor.
export function isPaymentProofComplete(proof) {
  if (!proof) return false;
  if (!proof.reference_number || !String(proof.reference_number).trim()) return false;
  if (proof.provider_code === 'pago_movil' && !proof.payer_phone) return false;
  if (proof.provider_code === 'pago_movil' && !proof.payer_id_number) return false;
  return true;
}

export const PAYMENT_VERIFICATION_MODES = {
  before: 'before', // bloquear creación hasta capturar comprobante
  after: 'after',   // crear orden y capturar comprobante después
};