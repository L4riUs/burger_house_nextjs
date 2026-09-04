import { describe, it, expect } from "vitest";
import {
  isCashPaymentMethod,
  requiresPaymentProof,
  isPaymentProofComplete,
} from "../payment-verification";

describe("payment-verification - requieren comprobante", () => {
  it("efectivo VES y USD (provider_code null) NO requieren comprobante", () => {
    expect(isCashPaymentMethod({ provider_code: null })).toBe(true);
    expect(isCashPaymentMethod({ name: "Efectivo USD", provider_code: null })).toBe(true);
    expect(requiresPaymentProof({ name: "Efectivo VES", provider_code: null })).toBe(false);
    expect(requiresPaymentProof({ name: "Efectivo USD", provider_code: null })).toBe(false);
  });

  it("métodos digitales requieren comprobante", () => {
    ["pago_movil", "binance", "zelle", "cashea", "tarjeta"].forEach((code) => {
      expect(requiresPaymentProof({ provider_code: code })).toBe(true);
    });
    expect(isCashPaymentMethod({ provider_code: "pago_movil" })).toBe(false);
  });

  it("método sin provider_code definido se trata como efectivo", () => {
    expect(isCashPaymentMethod({ name: "Efectivo" })).toBe(true);
    expect(requiresPaymentProof({ name: "Efectivo" })).toBe(false);
  });
});

describe("payment-verification - completitud del comprobante", () => {
  it("comprobante sin referencia es inválido", () => {
    expect(
      isPaymentProofComplete({ provider_code: "binance", reference_number: "" })
    ).toBe(false);
    expect(isPaymentProofComplete(null)).toBe(false);
  });

  it("binance/zelle solo exigen referencia", () => {
    expect(
      isPaymentProofComplete({ provider_code: "binance", reference_number: "ref-123" })
    ).toBe(true);
    expect(
      isPaymentProofComplete({ provider_code: "zelle", reference_number: "ref-123" })
    ).toBe(true);
  });

  it("pago_movil exige teléfono y cédula además de referencia", () => {
    expect(
      isPaymentProofComplete({ provider_code: "pago_movil", reference_number: "r1" })
    ).toBe(false);
    expect(
      isPaymentProofComplete({ provider_code: "pago_movil", reference_number: "r1", payer_phone: "0412" })
    ).toBe(false);
    expect(
      isPaymentProofComplete({
        provider_code: "pago_movil",
        reference_number: "r1",
        payer_phone: "0412",
        payer_id_number: "V-123",
      })
    ).toBe(true);
  });
});