import { z } from "zod";

export const auditFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  entity: z.string().optional().nullable(),
  actor_id: z.string().uuid().optional().nullable(),
  action: z.string().optional().nullable(),
  date_from: z.string().datetime({ offset: true }).optional().nullable(),
  date_to: z.string().datetime({ offset: true }).optional().nullable(),
});