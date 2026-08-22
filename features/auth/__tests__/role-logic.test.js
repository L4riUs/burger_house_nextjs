import { describe, it, expect } from "vitest";
import {
  getAssignableRoles,
  canAssignRole,
  isStaffRole,
  isOwnerOrAdmin,
  getRoleDisplayName,
} from "../role-logic";

describe("Role Logic", () => {
  describe("getAssignableRoles", () => {
    it("owner puede asignar todos los roles", () => {
      const roles = getAssignableRoles("owner");
      expect(roles).toContain("owner");
      expect(roles).toContain("admin");
      expect(roles).toContain("cajero");
      expect(roles).toContain("mesero");
      expect(roles).toContain("cocina");
      expect(roles).toContain("delivery");
      expect(roles).toContain("cliente");
    });

    it("admin puede asignar roles staff y cliente, pero NO owner", () => {
      const roles = getAssignableRoles("admin");
      expect(roles).toContain("admin");
      expect(roles).toContain("cajero");
      expect(roles).toContain("mesero");
      expect(roles).toContain("cocina");
      expect(roles).toContain("delivery");
      expect(roles).toContain("cliente");
      expect(roles).not.toContain("owner");
    });

    it("cajero no puede asignar ningún rol", () => {
      expect(getAssignableRoles("cajero")).toEqual([]);
    });

    it("mesero no puede asignar ningún rol", () => {
      expect(getAssignableRoles("mesero")).toEqual([]);
    });

    it("cocina no puede asignar ningún rol", () => {
      expect(getAssignableRoles("cocina")).toEqual([]);
    });

    it("delivery no puede asignar ningún rol", () => {
      expect(getAssignableRoles("delivery")).toEqual([]);
    });

    it("cliente no puede asignar ningún rol", () => {
      expect(getAssignableRoles("cliente")).toEqual([]);
    });

    it("rol inválido retorna array vacío", () => {
      expect(getAssignableRoles("invalid")).toEqual([]);
      expect(getAssignableRoles(null)).toEqual([]);
      expect(getAssignableRoles(undefined)).toEqual([]);
    });
  });

  describe("canAssignRole", () => {
    it("owner puede asignar owner", () => {
      expect(canAssignRole("owner", "owner")).toBe(true);
    });

    it("owner puede asignar cualquier rol", () => {
      expect(canAssignRole("owner", "admin")).toBe(true);
      expect(canAssignRole("owner", "cliente")).toBe(true);
    });

    it("admin NO puede asignar owner", () => {
      expect(canAssignRole("admin", "owner")).toBe(false);
    });

    it("admin puede asignar admin", () => {
      expect(canAssignRole("admin", "admin")).toBe(true);
    });

    it("admin puede asignar roles operativos", () => {
      expect(canAssignRole("admin", "cajero")).toBe(true);
      expect(canAssignRole("admin", "mesero")).toBe(true);
      expect(canAssignRole("admin", "cocina")).toBe(true);
      expect(canAssignRole("admin", "delivery")).toBe(true);
      expect(canAssignRole("admin", "cliente")).toBe(true);
    });

    it("cajero no puede asignar ningún rol", () => {
      expect(canAssignRole("cajero", "cliente")).toBe(false);
      expect(canAssignRole("cajero", "admin")).toBe(false);
    });

    it("retorna false para actor inválido", () => {
      expect(canAssignRole("invalid", "cliente")).toBe(false);
      expect(canAssignRole(null, "cliente")).toBe(false);
    });

    it("retorna false para target inválido", () => {
      expect(canAssignRole("owner", "invalid")).toBe(false);
    });
  });

  describe("isStaffRole", () => {
    it("identifica roles de staff correctamente", () => {
      expect(isStaffRole("owner")).toBe(true);
      expect(isStaffRole("admin")).toBe(true);
      expect(isStaffRole("cajero")).toBe(true);
      expect(isStaffRole("mesero")).toBe(true);
      expect(isStaffRole("cocina")).toBe(true);
      expect(isStaffRole("delivery")).toBe(true);
    });

    it("cliente no es staff", () => {
      expect(isStaffRole("cliente")).toBe(false);
    });
  });

  describe("isOwnerOrAdmin", () => {
    it("owner es owner o admin", () => {
      expect(isOwnerOrAdmin("owner")).toBe(true);
    });

    it("admin es owner o admin", () => {
      expect(isOwnerOrAdmin("admin")).toBe(true);
    });

    it("otros roles no son owner o admin", () => {
      expect(isOwnerOrAdmin("cajero")).toBe(false);
      expect(isOwnerOrAdmin("cliente")).toBe(false);
    });
  });

  describe("getRoleDisplayName", () => {
    it("retorna nombres en español", () => {
      expect(getRoleDisplayName("owner")).toBe("Propietario");
      expect(getRoleDisplayName("admin")).toBe("Administrador");
      expect(getRoleDisplayName("cajero")).toBe("Cajero");
      expect(getRoleDisplayName("mesero")).toBe("Mesero");
      expect(getRoleDisplayName("cocina")).toBe("Cocina");
      expect(getRoleDisplayName("delivery")).toBe("Delivery");
      expect(getRoleDisplayName("cliente")).toBe("Cliente");
    });

    it("retorna el rol original si no es conocido", () => {
      expect(getRoleDisplayName("unknown")).toBe("unknown");
    });
  });
});
