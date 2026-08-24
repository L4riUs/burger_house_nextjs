import { z } from "zod";

export const guestCustomerSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  address: z.string().optional().nullable(),
});

export const checkoutFulfillmentSchema = z
  .object({
    fulfillment_type: z.enum(["dine_in", "pickup", "delivery"], {
      required_error: "Debe seleccionar un tipo de entrega",
    }),
    table_id: z.string().uuid("Mesa inválida").optional().nullable(),
    delivery_address: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.fulfillment_type === "dine_in") {
        return data.table_id !== null && data.table_id !== undefined;
      }
      return true;
    },
    {
      message: "Debe seleccionar una mesa",
      path: ["table_id"],
    }
  )
  .refine(
    (data) => {
      if (data.fulfillment_type === "delivery") {
        return data.delivery_address && data.delivery_address.trim().length > 0;
      }
      return true;
    },
    {
      message: "La dirección es requerida para delivery",
      path: ["delivery_address"],
    }
  );

export const checkoutContactSchema = z.discriminatedUnion("customer_type", [
  z.object({
    customer_type: z.literal("guest"),
    guest_customer: guestCustomerSchema.optional().nullable(),
  }),
  z.object({
    customer_type: z.literal("authenticated"),
    profile_id: z.string().uuid("Debe estar autenticado"),
  }),
]);

export const guestCheckoutFormSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  address: z.string().optional(),
});

export const checkoutPaymentSchema = z.object({
  payment_method_id: z.string().uuid("Debe seleccionar un método de pago"),
});

// ============================================================================
// Comprobantes de pago (Pago Móvil / Binance / Zelle)
// ============================================================================

export const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const paymentReceiptSchema = z
  .instanceof(File, { message: "Debes adjuntar la foto del comprobante" })
  .refine((file) => file.size > 0, {
    message: "El archivo está vacío",
  })
  .refine((file) => file.size <= RECEIPT_MAX_SIZE_BYTES, {
    message: "La imagen no debe superar 5MB",
  })
  .refine((file) => file.type.startsWith("image/"), {
    message: "El comprobante debe ser una imagen",
  });

const referenceNumberSchema = z
  .string()
  .trim()
  .min(6, "El número de operación debe tener al menos 6 caracteres")
  .max(80, "El número de operación es demasiado largo");

const pagoMovilProofFields = {
  reference_number: referenceNumberSchema,
  payer_phone: z
    .string()
    .trim()
    .regex(
      /^04(12|14|16|22|24|26)\d{7}$/,
      "Teléfono inválido. Ej: 04121234567"
    ),
  payer_id_number: z
    .string()
    .trim()
    .regex(
      /^[VEJG]-?\d{5,9}$/i,
      "Cédula inválida. Ej: V12345678"
    ),
  receipt_file: paymentReceiptSchema,
};

const digitalWalletProofFields = {
  reference_number: referenceNumberSchema,
  receipt_file: paymentReceiptSchema,
};

export const paymentProofSchema = z.discriminatedUnion("provider_code", [
  z.object({ provider_code: z.literal("pago_movil"), ...pagoMovilProofFields }),
  z.object({ provider_code: z.literal("binance"), ...digitalWalletProofFields }),
  z.object({ provider_code: z.literal("zelle"), ...digitalWalletProofFields }),
]);

export function requiresPaymentProof(providerCode) {
  return (
    providerCode === "pago_movil" ||
    providerCode === "binance" ||
    providerCode === "zelle"
  );
}

export function buildPaymentFormSchema(providerCode) {
  return z.object({
    payment_method_id: z.string().uuid("Debe seleccionar un método de pago"),
    ...(providerCode === "pago_movil"
      ? pagoMovilProofFields
      : requiresPaymentProof(providerCode)
        ? digitalWalletProofFields
        : {}),
  });
}

const cartExtraSchema = z.object({
  id: z.string().optional(),
  extra: z
    .object({
      id: z.string().uuid(),
      name: z.any(),
      price_ves: z.coerce.number(),
      price_usd: z.coerce.number(),
    })
    .optional(),
  name: z.any().optional(),
  price_ves: z.coerce.number().optional(),
  price_usd: z.coerce.number().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
});

const cartProductSchema = z.object({
  id: z.string(),
  type: z.literal("product"),
  product: z.object({
    id: z.string().uuid(),
    name: z.any(),
    price_ves: z.coerce.number(),
    price_usd: z.coerce.number(),
    image_url: z.string().optional().nullable(),
    is_sold_out: z.boolean().default(false),
  }),
  quantity: z.coerce.number().int().min(1),
  extras: z.array(cartExtraSchema).default([]),
});

const cartComboSchema = z.object({
  id: z.string(),
  type: z.literal("combo"),
  combo: z.object({
    id: z.string().uuid(),
    name: z.any(),
    price_ves: z.coerce.number(),
    price_usd: z.coerce.number(),
    image_url: z.string().optional().nullable(),
    combo_items: z.array(
      z.object({
        id: z.string(),
        quantity: z.coerce.number().int().min(1),
        product: z
          .object({
            id: z.string().uuid(),
            name: z.any(),
            price_ves: z.coerce.number(),
            price_usd: z.coerce.number(),
          })
          .optional(),
      })
    ).optional(),
  }),
  quantity: z.coerce.number().int().min(1),
});

export const cartItemSchema = z.union([cartProductSchema, cartComboSchema]);

export const checkoutDraftSchema = z
  .object({
    fulfillment_type: z.enum(["dine_in", "pickup", "delivery"]),
    table_id: z.string().uuid().optional().nullable(),
    delivery_address: z.string().optional().nullable(),
    currency: z.enum(["VES", "USD"]).default("VES"),
    exchange_rate: z.coerce.number().positive().default(1),
    subtotal_ves: z.coerce.number().min(0),
    subtotal_usd: z.coerce.number().min(0),
    total_ves: z.coerce.number().min(0),
    total_usd: z.coerce.number().min(0),
    customer_type: z.enum(["guest", "authenticated"]),
    profile_id: z.string().uuid().optional().nullable(),
    guest_customer: guestCustomerSchema.optional().nullable(),
    payment_method_id: z.string().uuid(),
    // Comprobante de pago (solo métodos con verificación manual)
    payment_proof: z
      .object({
        provider_code: z.enum(["pago_movil", "binance", "zelle"]),
        reference_number: z.string().min(1),
        payer_phone: z.string().nullable(),
        payer_id_number: z.string().nullable(),
      })
      .optional()
      .nullable(),
    cart_items: z.array(cartItemSchema).min(1, "El carrito no puede estar vacío"),
  })
  .refine(
    (data) => {
      if (data.customer_type === "authenticated" && !data.profile_id) {
        return false;
      }
      return true;
    },
    {
      message: "profile_id es requerido para clientes autenticados",
      path: ["profile_id"],
    }
  )
  .refine(
    (data) => {
      if (data.customer_type === "guest" && data.fulfillment_type === "delivery") {
        return (
          data.guest_customer &&
          data.guest_customer.address &&
          data.guest_customer.address.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "La dirección es requerida para delivery",
      path: ["guest_customer"],
    }
  )
  .refine(
    (data) => {
      if (data.fulfillment_type === "dine_in" && !data.table_id) {
        return false;
      }
      return true;
    },
    {
      message: "Debe seleccionar una mesa para dine_in",
      path: ["table_id"],
    }
  );
