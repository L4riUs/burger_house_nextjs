import { describe, it, expect } from "vitest";
import { supplierSchema, supplierFormSchema } from "../schemas";

describe("Supplier Schemas", () => {
  describe("supplierSchema", () => {
    it("acepta datos válidos completos", () => {
      const result = supplierSchema.safeParse({
        name: "Distribuidora Alimentos SA",
        tax_id: "J-12345678-9",
        contact_name: "Juan Pérez",
        phone: "+58 212-555-1234",
        email: "ventas@distribuidora.com",
        address: "Av. Principal, Edificio Central, Piso 5",
        notes: "Pago a 30 días",
      });
      expect(result.success).toBe(true);
    });

    it("acepta solo nombre requerido", () => {
      const result = supplierSchema.safeParse({
        name: "Proveedor Simple",
        tax_id: null,
        contact_name: null,
        phone: null,
        email: null,
        address: null,
        notes: null,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza nombre vacío", () => {
      const result = supplierSchema.safeParse({
        name: "",
        tax_id: "J-12345678-9",
      });
      expect(result.success).toBe(false);
      expect(result.error.issues.length).toBeGreaterThan(0);
      const errorMessage = result.error.issues[0].message;
      expect(errorMessage).toContain("requerido");
    });

    it("rechaza email inválido", () => {
      const result = supplierSchema.safeParse({
        name: "Test",
        email: "no-es-email",
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Email inválido");
    });

    it("acepta email válido", () => {
      const result = supplierSchema.safeParse({
        name: "Test",
        email: "test@ejemplo.com",
      });
      expect(result.success).toBe(true);
    });

    it("acepta campos opcionales como null o undefined", () => {
      const result = supplierSchema.safeParse({
        name: "Test",
        tax_id: undefined,
        contact_name: undefined,
        phone: undefined,
        email: undefined,
        address: undefined,
        notes: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("supplierFormSchema", () => {
    it("valida igual que supplierSchema", () => {
      const result = supplierFormSchema.safeParse({
        name: "Proveedor Test",
        tax_id: "J-98765432-1",
        contact_name: "María López",
        phone: "+58 414-555-5678",
        email: "maria@proveedor.com",
        address: "Calle 123, Urb. Las Mercedes",
        notes: "Entrega los lunes",
      });
      expect(result.success).toBe(true);
    });
  });
});