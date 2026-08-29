"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkoutDraftSchema, guestCustomerSchema } from "./schemas";
import { createOrder } from "@/features/orders/actions";

export async function createGuestCustomer(formData) {
  const supabase = await createClient();

  const parsed = guestCustomerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
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
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  if (parsed.data.payment_proof) {
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

  const cartItems = parsed.data.cart_items.map((item) => {
    if (item.type === "combo") {
      return {
        type: "combo",
        combo_id: item.combo.id,
        quantity: item.quantity,
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
  });

  const orderData = {
    ...parsed.data,
    cart_items: cartItems,
    channel: 'storefront',
    taken_by: null,
  };

  const result = await createOrder(orderData);

  revalidatePath("/checkout");

  return result;
}