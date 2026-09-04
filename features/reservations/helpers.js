/**
 * Determina si una reservación puede ser sentada (sent to seat).
 * Una reserva es sentable cuando su estado es 'pending' o 'confirmed'
 * y la fecha/hora reservada es ahora o ya pasó.
 */
export function canSeatReservation(reservation) {
  if (!reservation) return false;
  const status = reservation.status;
  if (status !== "pending" && status !== "confirmed") return false;

  const reservedAt = new Date(reservation.reserved_at);
  const now = new Date();
  return reservedAt <= now;
}

/**
 * Determina si una reservación puede ser editada.
 * Solo se puede editar si está en pending o confirmed.
 */
export function canEditReservation(reservation) {
  if (!reservation) return false;
  return reservation.status === "pending" || reservation.status === "confirmed";
}

/**
 * Determina si una reservación puede ser cancelada.
 * No se puede cancelar si ya fue sentada, cancelada o marcada como no_show.
 */
export function canCancelReservation(reservation) {
  if (!reservation) return false;
  return reservation.status !== "seated" && reservation.status !== "cancelled" && reservation.status !== "no_show";
}

/**
 * Formatea el nombre de un cliente para mostrar.
 */
export function getCustomerName(reservation) {
  if (reservation?.profile?.full_name) return reservation.profile.full_name;
  if (reservation?.guest_customer?.full_name) return reservation.guest_customer.full_name;
  return "Cliente";
}
