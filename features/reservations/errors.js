/**
 * Parsea errores de Supabase para extraer mensajes amigables.
 * Fuente de verdad: la restricción exclusion constraint de Postgres.
 */

export const OVERLAP_CONSTRAINT = "excl_reservation_overlap";
export const EXCLUSION_VIOLATION_CODE = "23P01";

/**
 * Detecta si el error es una violación de solapamiento de reservas.
 * @param {object} error - Objeto de error de Supabase
 * @returns {string|null} Mensaje amigable o null si no es solapamiento
 */
export function getReservationOverlapMessage(error) {
  if (!error) return null;

  const code = error.code || error.hint || "";
  const constraint = error.constraint || "";
  const raw = [error.message, error.details, error.hint, error.code].filter(Boolean).join(" ");

  if (
    code === EXCLUSION_VIOLATION_CODE ||
    constraint === OVERLAP_CONSTRAINT ||
    raw.includes(OVERLAP_CONSTRAINT) ||
    raw.includes(EXCLUSION_VIOLATION_CODE)
  ) {
    return "La mesa ya tiene una reserva en ese horario. Selecciona otra mesa u otro horario.";
  }

  return null;
}
