export class UnitTypeMismatchError extends Error {
  constructor(fromUnitType, toUnitType) {
    super(
      `No se puede convertir entre unidades de tipos diferentes: ${fromUnitType} → ${toUnitType}`
    );
    this.name = 'UnitTypeMismatchError';
    this.fromUnitType = fromUnitType;
    this.toUnitType = toUnitType;
  }
}

export function findUnitById(units, unitId) {
  return units.find((u) => u.id === unitId);
}

export function convertUnits(value, fromUnitId, toUnitId, units) {
  if (fromUnitId === toUnitId) {
    return value;
  }

  const fromUnit = findUnitById(units, fromUnitId);
  const toUnit = findUnitById(units, toUnitId);

  if (!fromUnit || !toUnit) {
    throw new Error('Unidad no encontrada');
  }

  if (fromUnit.unit_type !== toUnit.unit_type) {
    throw new UnitTypeMismatchError(fromUnit.unit_type, toUnit.unit_type);
  }

  const fromFactor = Number(fromUnit.conversion_factor);
  const toFactor = Number(toUnit.conversion_factor);

  const baseValue = value * fromFactor;
  return baseValue / toFactor;
}

export function getUnitsByType(units, unitType) {
  return units.filter((u) => u.unit_type === unitType);
}

export function getBaseUnit(units, unitType) {
  return units.find((u) => u.unit_type === unitType && u.is_base_unit);
}

export function unitsAreCompatible(fromUnitId, toUnitId, units) {
  const fromUnit = findUnitById(units, fromUnitId);
  const toUnit = findUnitById(units, toUnitId);
  
  if (!fromUnit || !toUnit) {
    return false;
  }
  
  return fromUnit.unit_type === toUnit.unit_type;
}