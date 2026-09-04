import { describe, it, expect } from "vitest";
import { getReservationOverlapMessage, OVERLAP_CONSTRAINT, EXCLUSION_VIOLATION_CODE } from "../errors";

describe("getReservationOverlapMessage", () => {
  it("returns friendly message when error code is 23P01", () => {
    const error = { code: EXCLUSION_VIOLATION_CODE, message: "conflicting update or delete", details: "", hint: "" };
    expect(getReservationOverlapMessage(error)).toBe(
      "La mesa ya tiene una reserva en ese horario. Selecciona otra mesa u otro horario."
    );
  });

  it("returns friendly message when error contains constraint name", () => {
    const error = { code: "", message: "", details: "Key (excl_reservation_overlap)", hint: "" };
    expect(getReservationOverlapMessage(error)).toBe(
      "La mesa ya tiene una reserva en ese horario. Selecciona otra mesa u otro horario."
    );
  });

  it("returns friendly message when code 23P01 appears in message text", () => {
    const error = { code: "", message: "23P01 exclusion violation", details: "", hint: "" };
    expect(getReservationOverlapMessage(error)).toBe(
      "La mesa ya tiene una reserva en ese horario. Selecciona otra mesa u otro horario."
    );
  });

  it("returns null for unrelated errors", () => {
    const error = { code: "23503", message: "foreign key violation", details: "", hint: "" };
    expect(getReservationOverlapMessage(error)).toBeNull();
  });

  it("returns null for null/undefined error", () => {
    expect(getReservationOverlapMessage(null)).toBeNull();
    expect(getReservationOverlapMessage(undefined)).toBeNull();
  });

  it("returns null for empty error object", () => {
    expect(getReservationOverlapMessage({})).toBeNull();
  });
});
