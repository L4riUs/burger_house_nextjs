export const MOVEMENT_TYPES = {
  // Entradas (positivo)
  PURCHASE_IN: 'purchase_in',
  ADJUSTMENT_IN: 'adjustment_in',
  TRANSFER_IN: 'transfer_in',
  // Salidas (negativo)
  SALE_OUT: 'sale_out',
  ADJUSTMENT_OUT: 'adjustment_out',
  WASTE: 'waste',
  TRANSFER_OUT: 'transfer_out',
};

export const ENTRY_MOVEMENT_TYPES = [
  MOVEMENT_TYPES.PURCHASE_IN,
  MOVEMENT_TYPES.ADJUSTMENT_IN,
  MOVEMENT_TYPES.TRANSFER_IN,
];

export const EXIT_MOVEMENT_TYPES = [
  MOVEMENT_TYPES.SALE_OUT,
  MOVEMENT_TYPES.ADJUSTMENT_OUT,
  MOVEMENT_TYPES.WASTE,
  MOVEMENT_TYPES.TRANSFER_OUT,
];

export const MOVEMENT_TYPE_LABELS = {
  [MOVEMENT_TYPES.PURCHASE_IN]: 'Compra / Entrada',
  [MOVEMENT_TYPES.ADJUSTMENT_IN]: 'Ajuste de Entrada',
  [MOVEMENT_TYPES.TRANSFER_IN]: 'Transferencia Entrada',
  [MOVEMENT_TYPES.SALE_OUT]: 'Venta / Salida',
  [MOVEMENT_TYPES.ADJUSTMENT_OUT]: 'Ajuste de Salida',
  [MOVEMENT_TYPES.WASTE]: 'Merma / Desperdicio',
  [MOVEMENT_TYPES.TRANSFER_OUT]: 'Transferencia Salida',
};

export const MOVEMENT_TYPE_VARIANTS = {
  [MOVEMENT_TYPES.PURCHASE_IN]: 'default',
  [MOVEMENT_TYPES.ADJUSTMENT_IN]: 'secondary',
  [MOVEMENT_TYPES.TRANSFER_IN]: 'outline',
  [MOVEMENT_TYPES.SALE_OUT]: 'destructive',
  [MOVEMENT_TYPES.ADJUSTMENT_OUT]: 'destructive',
  [MOVEMENT_TYPES.WASTE]: 'destructive',
  [MOVEMENT_TYPES.TRANSFER_OUT]: 'outline',
};

export function getMovementSign(movementType) {
  if (ENTRY_MOVEMENT_TYPES.includes(movementType)) {
    return 1;
  }
  if (EXIT_MOVEMENT_TYPES.includes(movementType)) {
    return -1;
  }
  return 0;
}

export function isEntryMovement(movementType) {
  return ENTRY_MOVEMENT_TYPES.includes(movementType);
}

export function isExitMovement(movementType) {
  return EXIT_MOVEMENT_TYPES.includes(movementType);
}

export function getMovementTypeLabel(movementType) {
  return MOVEMENT_TYPE_LABELS[movementType] || movementType;
}

export function getMovementTypeVariant(movementType) {
  return MOVEMENT_TYPE_VARIANTS[movementType] || 'secondary';
}

export function getAllMovementTypes() {
  return Object.values(MOVEMENT_TYPES);
}

export function getMovementTypeOptions() {
  return getAllMovementTypes().map((type) => ({
    value: type,
    label: getMovementTypeLabel(type),
  }));
}

export function getMovementTypeOptionsGrouped() {
  return [
    {
      label: 'Entradas',
      options: ENTRY_MOVEMENT_TYPES.map((type) => ({
        value: type,
        label: getMovementTypeLabel(type),
      })),
    },
    {
      label: 'Salidas',
      options: EXIT_MOVEMENT_TYPES.map((type) => ({
        value: type,
        label: getMovementTypeLabel(type),
      })),
    },
  ];
}