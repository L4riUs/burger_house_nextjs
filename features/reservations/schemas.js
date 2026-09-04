import { z } from "zod";

export const reservationSchema = z.object({
  customer_type: z.enum(["authenticated", "guest"], {
    required_error: "Selecciona un tipo de cliente",
  }),
  profile_id: z.string().uuid().optional().nullable(),
  guest_customer_id: z.string().uuid().optional().nullable(),
  table_id: z.string().uuid().optional().nullable(),
  package_id: z.string().uuid().optional().nullable(),
  party_size: z.coerce.number().int().min(1, "Debe haber al menos 1 persona"),
  reserved_at: z.string().min(1, "La fecha/hora es requerida"),
  duration_minutes: z.coerce.number().int().min(15, "Duración mínima: 15 minutos").default(90),
  status: z.enum(["pending", "confirmed", "seated", "cancelled", "no_show"]).default("pending"),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.customer_type === "authenticated") return !!data.profile_id;
    return !!data.guest_customer_id;
  },
  { message: "Selecciona o crea un cliente válido", path: ["customer_type"] },
).refine(
  (data) => !!data.table_id || !!data.package_id,
  { message: "Selecciona una mesa o un paquete de reservación", path: ["table_id"] },
);

export const RESERVATION_STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  seated: "Sentada",
  cancelled: "Cancelada",
  no_show: "No presentó",
};

export const RESERVATION_STATUS_VARIANT = {
  pending: "secondary",
  confirmed: "default",
  seated: "default",
  cancelled: "destructive",
  no_show: "outline",
};