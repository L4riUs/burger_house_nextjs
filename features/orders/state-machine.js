export const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_kitchen', 'cancelled'],
  in_kitchen: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'served', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  served: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function isValidTransition(fromStatus, toStatus) {
  return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

export function getValidTransitions(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

export function canCancel(status) {
  return status !== 'completed' && status !== 'cancelled';
}

export const ORDER_STATUSES = Object.keys(VALID_TRANSITIONS);

export function getStatusLabel(status) {
  const labels = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    in_kitchen: 'En Cocina',
    ready: 'Lista',
    out_for_delivery: 'En Reparto',
    served: 'Servida',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
}

export function getStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_kitchen: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    served: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}