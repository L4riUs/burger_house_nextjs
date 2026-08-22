import { z } from "zod";

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, "El nombre completo es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-()]{7,}$/.test(val), {
      message: "Ingresa un número de teléfono válido",
    }),
  avatar_url: z.string().url("URL de avatar inválida").optional().nullable(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(1, "La nueva contraseña es requerida")
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
