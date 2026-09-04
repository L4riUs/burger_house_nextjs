import { z } from "zod";

const tableStatusEnum = z.enum(["available", "occupied", "reserved", "out_of_service"]);

export const tableSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  capacity: z.coerce.number().int().min(1, "La capacidad debe ser al menos 1"),
  zone: z.string().optional().nullable(),
  status: tableStatusEnum.default("available"),
  is_vip: z.boolean().default(false),
});

export const tableFormSchema = tableSchema;

export const TABLE_STATUS_LABELS = {
  available: "Disponible",
  occupied: "Ocupada",
  reserved: "Reservada",
  out_of_service: "Fuera de servicio",
};

export const TABLE_STATUS_COLORS = {
  available: "bg-green-100 text-green-800 border-green-200",
  occupied: "bg-red-100 text-red-800 border-red-200",
  reserved: "bg-yellow-100 text-yellow-800 border-yellow-200",
  out_of_service: "bg-gray-100 text-gray-500 border-gray-200",
};
