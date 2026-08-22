import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas";

describe("Auth Schemas", () => {
  describe("loginSchema", () => {
    it("acepta credenciales válidas", () => {
      const result = loginSchema.safeParse({
        email: "test@burger.com",
        password: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza email inválido", () => {
      const result = loginSchema.safeParse({
        email: "no-es-email",
        password: "123456",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza contraseña vacía", () => {
      const result = loginSchema.safeParse({
        email: "test@burger.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza contraseña menor a 6 caracteres", () => {
      const result = loginSchema.safeParse({
        email: "test@burger.com",
        password: "12345",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("acepta datos válidos", () => {
      const result = registerSchema.safeParse({
        full_name: "Juan Pérez",
        email: "juan@burger.com",
        password: "123456",
        confirmPassword: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza si contraseñas no coinciden", () => {
      const result = registerSchema.safeParse({
        full_name: "Juan Pérez",
        email: "juan@burger.com",
        password: "123456",
        confirmPassword: "654321",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza nombre vacío", () => {
      const result = registerSchema.safeParse({
        full_name: "",
        email: "juan@burger.com",
        password: "123456",
        confirmPassword: "123456",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza nombre menor a 2 caracteres", () => {
      const result = registerSchema.safeParse({
        full_name: "J",
        email: "juan@burger.com",
        password: "123456",
        confirmPassword: "123456",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("acepta email válido", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "test@burger.com",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza email inválido", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "no-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("acepta contraseñas válidas coincidentes", () => {
      const result = resetPasswordSchema.safeParse({
        password: "nueva123",
        confirmPassword: "nueva123",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza si contraseñas no coinciden", () => {
      const result = resetPasswordSchema.safeParse({
        password: "nueva123",
        confirmPassword: "otra123",
      });
      expect(result.success).toBe(false);
    });
  });
});
