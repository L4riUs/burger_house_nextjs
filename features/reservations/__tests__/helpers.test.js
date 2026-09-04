import { describe, it, expect } from "vitest";
import { canSeatReservation, canEditReservation, canCancelReservation, getCustomerName } from "../helpers";

const baseReservation = {
  id: "1",
  status: "confirmed",
  reserved_at: "2020-01-01T10:00:00.000Z",
};

describe("canSeatReservation", () => {
  it("returns true when status is confirmed and time has passed", () => {
    expect(canSeatReservation({ ...baseReservation, reserved_at: "2000-01-01T10:00:00.000Z" })).toBe(true);
  });

  it("returns true when status is pending and time has passed", () => {
    expect(canSeatReservation({ ...baseReservation, status: "pending", reserved_at: "2000-01-01T10:00:00.000Z" })).toBe(true);
  });

  it("returns false when reserved time is in the future", () => {
    expect(canSeatReservation({ ...baseReservation, reserved_at: "2999-01-01T10:00:00.000Z" })).toBe(false);
  });

  it("returns false for seated, cancelled and no_show", () => {
    expect(canSeatReservation({ ...baseReservation, status: "seated", reserved_at: "2000-01-01T10:00:00.000Z" })).toBe(false);
    expect(canSeatReservation({ ...baseReservation, status: "cancelled", reserved_at: "2000-01-01T10:00:00.000Z" })).toBe(false);
    expect(canSeatReservation({ ...baseReservation, status: "no_show", reserved_at: "2000-01-01T10:00:00.000Z" })).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(canSeatReservation(null)).toBe(false);
    expect(canSeatReservation(undefined)).toBe(false);
  });
});

describe("canEditReservation", () => {
  it("returns true for pending and confirmed", () => {
    expect(canEditReservation({ ...baseReservation, status: "pending" })).toBe(true);
    expect(canEditReservation({ ...baseReservation, status: "confirmed" })).toBe(true);
  });

  it("returns false for sealed, cancelled and no_show", () => {
    expect(canEditReservation({ ...baseReservation, status: "seated" })).toBe(false);
    expect(canEditReservation({ ...baseReservation, status: "cancelled" })).toBe(false);
    expect(canEditReservation({ ...baseReservation, status: "no_show" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(canEditReservation(null)).toBe(false);
  });
});

describe("canCancelReservation", () => {
  it("returns true for pending and confirmed", () => {
    expect(canCancelReservation({ ...baseReservation, status: "pending" })).toBe(true);
    expect(canCancelReservation({ ...baseReservation, status: "confirmed" })).toBe(true);
  });

  it("returns false for seated, cancelled and no_show", () => {
    expect(canCancelReservation({ ...baseReservation, status: "seated" })).toBe(false);
    expect(canCancelReservation({ ...baseReservation, status: "cancelled" })).toBe(false);
    expect(canCancelReservation({ ...baseReservation, status: "no_show" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(canCancelReservation(null)).toBe(false);
  });
});

describe("getCustomerName", () => {
  it("prefers profile full_name", () => {
    expect(getCustomerName({ profile: { full_name: "Ana" } })).toBe("Ana");
  });

  it("falls back to guest full_name", () => {
    expect(getCustomerName({ guest_customer: { full_name: "Juan" } })).toBe("Juan");
  });

  it("prefers profile over guest", () => {
    expect(getCustomerName({ profile: { full_name: "Ana" }, guest_customer: { full_name: "Juan" } })).toBe("Ana");
  });

  it("falls back to default label", () => {
    expect(getCustomerName({})).toBe("Cliente");
    expect(getCustomerName(null)).toBe("Cliente");
  });
});