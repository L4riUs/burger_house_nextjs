import { z } from "zod";

const VALID_ROLES = ["owner", "admin", "cajero", "mesero", "cocina", "delivery", "cliente"];

export const changeRoleSchema = z.object({
  userId: z.string().uuid("ID de usuario inválido"),
  newRole: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: "Rol no válido" }),
  }),
});

export const listProfilesSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  role: z.enum(VALID_ROLES).optional(),
  search: z.string().optional(),
});
