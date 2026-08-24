"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkoutDraftSchema, guestCustomerSchema } from "./schemas";
import { getBcvRate } from "@/lib/bcv";

export async function createGuestCustomer(formData) {
  const supabase = await createClient();

  const parsed = guestCustomerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("guest_customers")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function createOrderDraft(formData, receiptFile = null) {
  const parsed = checkoutDraftSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  if (parsed.data.payment_proof) {
    // TODO(fase6): subir receiptFile al bucket 'payment-proofs' de Storage
    // y crear el registro en order_payment_proofs junto con la orden.
    console.log(
      "[createOrderDraft] Comprobante de pago:",
      JSON.stringify(
        {
          ...parsed.data.payment_proof,
          receipt_file: receiptFile
            ? {
                name: receiptFile.name,
                size: receiptFile.size,
                type: receiptFile.type,
              }
            : null,
        },
        null,
        2
      )
    );
  }

  const payload = {
    ...parsed.data,
    cart_items: parsed.data.cart_items.map((item) => {
      if (item.type === "combo") {
        return {
          type: "combo",
          combo_id: item.combo.id,
          quantity: item.quantity,
          combo_items: item.combo.combo_items?.map((ci) => ({
            product_id: ci.product?.id,
            quantity: ci.quantity,
          })),
        };
      }
      return {
        type: "product",
        product_id: item.product.id,
        quantity: item.quantity,
        extras: item.extras?.map((ex) => ({
          extra_id: ex.extra?.id || ex.id,
          quantity: ex.quantity || 1,
        })),
      };
    }),
  };

  // TODO(fase6): Conectar createOrderDraft con el módulo de Órdenes (Fase 6).
  // Por ahora solo valida con Zod y retorna el payload armado. No crea la orden.
  console.log("[createOrderDraft] Payload validado:", JSON.stringify(payload, null, 2));

  revalidatePath("/checkout");

  return {
    success: true,
    message:
      "Orden validada (stub). La creación real se conecta en la Fase 6.",
    payload,
  };
}
