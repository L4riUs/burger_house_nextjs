import { describe, it, expect } from "vitest";
import {
  getMovementSign,
  isEntryMovement,
  isExitMovement,
  getMovementTypeLabel,
  getMovementTypeVariant,
  MOVEMENT_TYPES,
  ENTRY_MOVEMENT_TYPES,
  EXIT_MOVEMENT_TYPES,
} from "../lib/movement-utils";

describe("Movement Utils", () => {
  describe("getMovementSign", () => {
    it("retorna +1 para tipos de entrada", () => {
      expect(getMovementSign(MOVEMENT_TYPES.PURCHASE_IN)).toBe(1);
      expect(getMovementSign(MOVEMENT_TYPES.ADJUSTMENT_IN)).toBe(1);
      expect(getMovementSign(MOVEMENT_TYPES.TRANSFER_IN)).toBe(1);
    });

    it("retorna -1 para tipos de salida", () => {
      expect(getMovementSign(MOVEMENT_TYPES.SALE_OUT)).toBe(-1);
      expect(getMovementSign(MOVEMENT_TYPES.ADJUSTMENT_OUT)).toBe(-1);
      expect(getMovementSign(MOVEMENT_TYPES.WASTE)).toBe(-1);
      expect(getMovementSign(MOVEMENT_TYPES.TRANSFER_OUT)).toBe(-1);
    });

    it("retorna 0 para tipo desconocido", () => {
      expect(getMovementSign('unknown_type')).toBe(0);
    });
  });

  describe("isEntryMovement", () => {
    it("retorna true para tipos de entrada", () => {
      expect(isEntryMovement(MOVEMENT_TYPES.PURCHASE_IN)).toBe(true);
      expect(isEntryMovement(MOVEMENT_TYPES.ADJUSTMENT_IN)).toBe(true);
      expect(isEntryMovement(MOVEMENT_TYPES.TRANSFER_IN)).toBe(true);
    });

    it("retorna false para tipos de salida", () => {
      expect(isEntryMovement(MOVEMENT_TYPES.SALE_OUT)).toBe(false);
      expect(isEntryMovement(MOVEMENT_TYPES.WASTE)).toBe(false);
    });
  });

  describe("isExitMovement", () => {
    it("retorna true para tipos de salida", () => {
      expect(isExitMovement(MOVEMENT_TYPES.SALE_OUT)).toBe(true);
      expect(isExitMovement(MOVEMENT_TYPES.ADJUSTMENT_OUT)).toBe(true);
      expect(isExitMovement(MOVEMENT_TYPES.WASTE)).toBe(true);
      expect(isExitMovement(MOVEMENT_TYPES.TRANSFER_OUT)).toBe(true);
    });

    it("retorna false para tipos de entrada", () => {
      expect(isExitMovement(MOVEMENT_TYPES.PURCHASE_IN)).toBe(false);
      expect(isExitMovement(MOVEMENT_TYPES.TRANSFER_IN)).toBe(false);
    });
  });

  describe("getMovementTypeLabel", () => {
    it("retorna etiquetas correctas", () => {
      expect(getMovementTypeLabel(MOVEMENT_TYPES.PURCHASE_IN)).toBe('Compra / Entrada');
      expect(getMovementTypeLabel(MOVEMENT_TYPES.SALE_OUT)).toBe('Venta / Salida');
      expect(getMovementTypeLabel(MOVEMENT_TYPES.WASTE)).toBe('Merma / Desperdicio');
    });

    it("retorna el tipo original si no existe", () => {
      expect(getMovementTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe("getMovementTypeVariant", () => {
    it("retorna variant destructivo para salidas", () => {
      expect(getMovementTypeVariant(MOVEMENT_TYPES.SALE_OUT)).toBe('destructive');
      expect(getMovementTypeVariant(MOVEMENT_TYPES.WASTE)).toBe('destructive');
    });

    it("retorna variant default para purchase_in", () => {
      expect(getMovementTypeVariant(MOVEMENT_TYPES.PURCHASE_IN)).toBe('default');
    });

    it("retorna variant secondary para adjustment_in", () => {
      expect(getMovementTypeVariant(MOVEMENT_TYPES.ADJUSTMENT_IN)).toBe('secondary');
    });

    it("retorna variant outline para transferencias", () => {
      expect(getMovementTypeVariant(MOVEMENT_TYPES.TRANSFER_IN)).toBe('outline');
      expect(getMovementTypeVariant(MOVEMENT_TYPES.TRANSFER_OUT)).toBe('outline');
    });
  });

  describe("Arrays de tipos", () => {
    it("ENTRY_MOVEMENT_TYPES contiene todos los tipos de entrada", () => {
      expect(ENTRY_MOVEMENT_TYPES).toHaveLength(3);
      expect(ENTRY_MOVEMENT_TYPES).toContain(MOVEMENT_TYPES.PURCHASE_IN);
      expect(ENTRY_MOVEMENT_TYPES).toContain(MOVEMENT_TYPES.ADJUSTMENT_IN);
      expect(ENTRY_MOVEMENT_TYPES).toContain(MOVEMENT_TYPES.TRANSFER_IN);
    });

    it("EXIT_MOVEMENT_TYPES contiene todos los tipos de salida", () => {
      expect(EXIT_MOVEMENT_TYPES).toHaveLength(4);
      expect(EXIT_MOVEMENT_TYPES).toContain(MOVEMENT_TYPES.SALE_OUT);
      expect(EXIT_MOVEMENT_TYPES).toContain(MOVEMENT_TYPES.ADJUSTMENT_OUT);
      expect(EXIT_MOVEMENT_TYPES).toContain(MOVEMENT_TYPES.WASTE);
      expect(EXIT_MOVEMENT_TYPES).toContain(MOVEMENT_TYPES.TRANSFER_OUT);
    });
  });
});