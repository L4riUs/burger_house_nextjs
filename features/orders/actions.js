"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBcvRate } from "@/lib/bcv";
import { ALLOW_NEGATIVE_STOCK, POS_PAYMENT_VERIFICATION } from '@/lib/config';
import { createOrderSchema, advanceOrderStatusSchema, assignDeliverySchema, posCreateOrderSchema, saveOrderProofSchema } from "./schemas";
import { calculateInventoryMovements, checkStockAvailability } from "./inventory-deduction";
import { isValidTransition, getValidTransitions } from "./state-machine";
import { isPaymentProofComplete, requiresPaymentProof } from "./payment-verification";

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function getCurrentUserRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role;
}

// Confirma la orden (descuenta inventario vía confirm_order_with_inventory) y la
// deja en 'confirmed', que es la cola de cocina. No fuerza 'in_kitchen' porque
// la política RLS de orders restringe esa transición a cocina/admin.
// Si no hay stock suficiente y ALLOW_NEGATIVE_STOCK está desactivado, deja la
// orden en 'pending' para que el staff decida.
async function confirmOrderForKitchen(orderId, userId, supabase) {
  const { data: orderState } = await supabase
    .from('orders')
    .select('id, cart_items:order_items(*)')
    .eq('id', orderId)
    .single();

  const cartItems = (orderState?.cart_items || []).map(item => ({
    type: item.combo_id ? 'combo' : 'product',
    product_id: item.product_id,
    combo_id: item.combo_id,
    quantity: item.quantity,
    extras: item.order_item_extras?.map(e => ({
      extra_id: e.extra_id,
      quantity: e.quantity,
    })) || [],
  }));

  const { stockChecks } = await calculateInventoryMovements(cartItems, supabase);
  const stockCheck = await checkStockAvailability(stockChecks, supabase);

  if (!stockCheck.ok && !ALLOW_NEGATIVE_STOCK) {
    console.log('[confirmOrderForKitchen] Stock insuficiente, revierte a pending', { orderId, warnings: stockCheck.warnings });
    await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId);
    return { error: "Stock insuficiente", warnings: stockCheck.warnings };
  }

  const { error: confirmRpc } = await supabase.rpc('confirm_order_with_inventory', {
    p_order_id: orderId,
    p_user_id: userId,
  });

  if (confirmRpc) {
    console.error('[confirmOrderForKitchen] Error al confirmar/descontar inventario', { orderId, message: confirmRpc.message });
    await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId);
    return { error: confirmRpc.message, warnings: stockCheck.warnings };
  }

  return { success: true, warnings: stockCheck.warnings };
}

export async function createOrder(formData) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();

  const parsed = createOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map(e => e.message).join(", ") };
  }

  const data = parsed.data;

  if (!userId && data.channel !== 'storefront') {
    return { error: "No autenticado" };
  }

  if (data.channel !== 'storefront') {
    if (!['owner', 'admin', 'cajero', 'mesero'].includes(userRole)) {
      return { error: "No tienes permisos para crear órdenes internas" };
    }
    data.taken_by = userId;
  }

  if (data.client_ref) {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .eq('client_ref', data.client_ref)
      .single();
    if (existingOrder) {
      return {
        success: "Orden ya sincronizada",
        data: { ...existingOrder, already_synced: true },
      };
    }
  }

  let exchange_rate = data.exchange_rate;
  if (exchange_rate === 1) {
    try {
      exchange_rate = await getBcvRate();
    } catch (e) {
      console.warn("[createOrder] Error getting BCV rate, using default:", e.message);
    }
  }

  let subtotal_ves = 0;
  let subtotal_usd = 0;

  for (const item of data.cart_items) {
    if (item.type === 'product') {
      const { data: product } = await supabase
        .from('products')
        .select('price_ves, price_usd')
        .eq('id', item.product_id)
        .single();
      
      if (product) {
        const itemTotalVes = Number(product.price_ves) * Number(item.quantity);
        const itemTotalUsd = Number(product.price_usd) * Number(item.quantity);
        subtotal_ves += itemTotalVes;
        subtotal_usd += itemTotalUsd;

        if (item.extras && item.extras.length > 0) {
          for (const extra of item.extras) {
            const { data: extraData } = await supabase
              .from('product_extras')
              .select('price_ves, price_usd')
              .eq('id', extra.extra_id)
              .single();
            if (extraData) {
              const extraQty = Number(extra.quantity) * Number(item.quantity);
              subtotal_ves += Number(extraData.price_ves) * extraQty;
              subtotal_usd += Number(extraData.price_usd) * extraQty;
            }
          }
        }
      }
    } else if (item.type === 'combo') {
      const { data: combo } = await supabase
        .from('combos')
        .select('price_ves, price_usd')
        .eq('id', item.combo_id)
        .single();
      
      if (combo) {
        subtotal_ves += Number(combo.price_ves) * Number(item.quantity);
        subtotal_usd += Number(combo.price_usd) * Number(item.quantity);
      }
    }
  }

  const total_ves = subtotal_ves;
  const total_usd = subtotal_usd;

  // Validar stock ANTES de crear el guest o la orden. Si falta stock y
  // ALLOW_NEGATIVE_STOCK está apagado, abortamos sin insertar nada (orders,
  // order_items) ni avisamos al usuario. Aplica a todos los canales.
  if (!ALLOW_NEGATIVE_STOCK) {
    const { stockChecks } = await calculateInventoryMovements(data.cart_items, supabase);
    const stockCheck = await checkStockAvailability(stockChecks, supabase);
    if (!stockCheck.ok) {
      return { error: "Stock insuficiente para completar la orden", warnings: stockCheck.warnings };
    }
  }

  let guestCustomerId = null;
  if (data.customer_type === 'guest') {
    if (data.guest_customer_id) {
      // Reutilizar un guest existente (ej. el 'Cliente mostrador' genérico de POS)
      // para no duplicar filas cuando la misma persona vuelve a pedir.
      guestCustomerId = data.guest_customer_id;
    } else if (data.guest_customer?.full_name === 'Cliente mostrador' && data.guest_customer?.phone === '-') {
      // Guest anónimo de POS: reutilizar el único registro genérico existente,
      // creándolo solo la primera vez para no duplicar filas.
      const { data: existing } = await supabase
        .from('guest_customers')
        .select('id')
        .eq('full_name', 'Cliente mostrador')
        .eq('phone', '-')
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (existing) {
        guestCustomerId = existing.id;
      } else {
        guestCustomerId = crypto.randomUUID();
        const { data: insertedGuest, error: guestError } = await supabase
          .from('guest_customers')
          .insert({ id: guestCustomerId, ...data.guest_customer })
          .select()
          .single();

        if (guestError) {
          return { error: guestError.message };
        }
        guestCustomerId = insertedGuest?.id || guestCustomerId;
      }
    } else if (data.guest_customer) {
      guestCustomerId = crypto.randomUUID();
      const { data: insertedGuest, error: guestError } = await supabase
        .from('guest_customers')
        .insert({ id: guestCustomerId, ...data.guest_customer })
        .select()
        .single();

      if (guestError) {
        return { error: guestError.message };
      }
      guestCustomerId = insertedGuest?.id || guestCustomerId;
    }
  }

  let directToKitchen = false;
  let hasApprovedProof = false;
  if (data.channel === 'pos') {
    // En POS, capturar el comprobante implica que el cajero confirmó el cobro.
    hasApprovedProof = !!data.payment_proof;

    if (POS_PAYMENT_VERIFICATION === 'before') {
      // Modo 'before': el pago se exige antes de preparar. La orden solo sale de
      // pending (→ cocina) cuando el cobro está confirmado: efectivo o
      // comprobante digital aprobado.
      const { data: paymentMethod } = await supabase
        .from('payment_methods')
        .select('provider_code')
        .eq('id', data.payment_method_id)
        .single();
      const isCash = paymentMethod?.provider_code === null || paymentMethod?.provider_code === undefined;
      directToKitchen = isCash || hasApprovedProof;
    } else {
      // Modo 'after': se cobra al cerrar la cuenta, en paralelo. La orden va a
      // la cocina al crearse, sin esperar el pago.
      directToKitchen = true;
    }
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      profile_id: data.customer_type === 'authenticated' ? data.profile_id : null,
      guest_customer_id: guestCustomerId,
      fulfillment_type: data.fulfillment_type,
      table_id: data.table_id,
      delivery_address: data.delivery_address,
      status: 'pending',
      currency: data.currency,
      exchange_rate,
      subtotal_ves,
      subtotal_usd,
      total_ves,
      total_usd,
      payment_method_id: data.payment_method_id,
      channel: data.channel,
      taken_by: data.taken_by,
      client_ref: data.client_ref,
      notes: data.notes,
    })
    .select()
    .single();

  if (orderError) {
    if (guestCustomerId && data.guest_customer_id !== guestCustomerId) {
      await supabase.from('guest_customers').delete().eq('id', guestCustomerId);
    }
    return { error: orderError.message };
  }

  // Verificación de pago: persistir el comprobante cuando el método lo exige.
  if (data.payment_proof) {
    if (!data.payment_proof.receipt_path) {
      await supabase.from('orders').delete().eq('id', order.id);
      return { error: "Debe adjuntar el comprobante de pago (foto)" };
    }
    if (!isPaymentProofComplete(data.payment_proof)) {
      await supabase.from('orders').delete().eq('id', order.id);
      return { error: "Comprobante de pago incompleto (referencia y, para pago móvil, teléfono y cédula)" };
    }
    const { error: proofError } = await supabase
      .from('order_payment_proofs')
      .insert({
        order_id: order.id,
        payment_method_id: data.payment_method_id,
        reference_number: data.payment_proof.reference_number,
        payer_phone: data.payment_proof.payer_phone,
        payer_id_number: data.payment_proof.payer_id_number,
        receipt_path: data.payment_proof.receipt_path,
        status: hasApprovedProof ? 'approved' : 'pending',
      });

    if (proofError) {
      await supabase.from('orders').delete().eq('id', order.id);
      return { error: proofError.message };
    }
  }

  for (const item of data.cart_items) {
    if (item.type === 'product') {
      const { data: product } = await supabase
        .from('products')
        .select('price_ves, price_usd')
        .eq('id', item.product_id)
        .single();

      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_ves: product?.price_ves || 0,
          unit_price_usd: product?.price_usd || 0,
        })
        .select()
        .single();

      if (itemError) {
        await supabase.from('orders').delete().eq('id', order.id);
        return { error: itemError.message };
      }

      if (item.extras && item.extras.length > 0) {
        for (const extra of item.extras) {
          const { data: extraData } = await supabase
            .from('product_extras')
            .select('price_ves, price_usd')
            .eq('id', extra.extra_id)
            .single();

          await supabase
            .from('order_item_extras')
            .insert({
              order_item_id: orderItem.id,
              extra_id: extra.extra_id,
              quantity: extra.quantity,
              unit_price_ves: extraData?.price_ves || 0,
              unit_price_usd: extraData?.price_usd || 0,
            });
        }
      }
    } else if (item.type === 'combo') {
      const { data: combo } = await supabase
        .from('combos')
        .select('price_ves, price_usd')
        .eq('id', item.combo_id)
        .single();

      await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          combo_id: item.combo_id,
          quantity: item.quantity,
          unit_price_ves: combo?.price_ves || 0,
          unit_price_usd: combo?.price_usd || 0,
        });
    }
  }

  if (directToKitchen) {
    // POS: cobro en el acto (efectivo o comprobante aprobado).
    // Confirmar automáticamente (descuenta inventario) para poner la orden en la
    // cola de cocina ('confirmed'). El personal de cocina la inicia después.
    const confirmResult = await confirmOrderForKitchen(order.id, userId, supabase);
    if (confirmResult.error) {
      // La orden quedó en 'pending' (stock insuficiente o RPC falló). Avisar al
      // usuario en vez de fingir éxito.
      revalidatePath("/admin/orders");
      revalidatePath("/cocina");
      revalidatePath("/delivery");
      revalidatePath("/tracking");
      return {
        error: confirmResult.error,
        warnings: confirmResult.warnings,
        orderId: order.id,
        orderPending: true,
      };
    }
  } else {
    await supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        from_status: null,
        to_status: 'pending',
        changed_by: userId,
      });
  }

  revalidatePath("/admin/orders");
  revalidatePath("/cocina");
  revalidatePath("/delivery");
  revalidatePath("/tracking");

  return { 
    success: "Orden creada correctamente", 
    data: { ...order, guest_customer_id: guestCustomerId } 
  };
}

export async function confirmOrder(orderId) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return { error: "No autenticado" };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, channel, payment_method_id, cart_items:order_items(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { error: "Orden no encontrada" };
  }

  if (order.status !== 'pending') {
    return { error: "Solo se pueden confirmar órdenes en estado pendiente" };
  }

  // Canal teléfono/WhatsApp: exige comprobante de pago aprobado antes de
  // confirmar (el cobro queda pendiente hasta que el staff registra el pago).
  if (order.channel === 'phone') {
    const { data: proof } = await supabase
      .from('order_payment_proofs')
      .select('id, status')
      .eq('order_id', orderId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (!order.payment_method_id || !proof) {
      return {
        error: "Para confirmar una orden por teléfono/WhatsApp debes registrar el comprobante de pago aprobado",
      };
    }
  }

  const cartItems = order.cart_items.map(item => ({
    type: item.combo_id ? 'combo' : 'product',
    product_id: item.product_id,
    combo_id: item.combo_id,
    quantity: item.quantity,
    extras: item.order_item_extras?.map(e => ({
      extra_id: e.extra_id,
      quantity: e.quantity,
    })) || [],
  }));

  console.log('[confirmOrder] Iniciando confirmación', { orderId, userId });

  const { movements, stockChecks } = await calculateInventoryMovements(cartItems, supabase);
  console.log('[confirmOrder] Movimientos calculados', { movementsCount: movements.length, movements });

  const stockCheck = await checkStockAvailability(stockChecks, supabase);
  console.log('[confirmOrder] Stock check', { stockCheck, ALLOW_NEGATIVE_STOCK });

  if (!stockCheck.ok && !ALLOW_NEGATIVE_STOCK) {
    console.log('[confirmOrder] Stock insuficiente - bloqueando', { stockCheck });
    return { 
      error: "Stock insuficiente", 
      warnings: stockCheck.warnings,
      blocking: true 
    };
  }

  console.log('[confirmOrder] Llamando RPC confirm_order_with_inventory', { orderId, userId });
  let rpcError = null;
  try {
    const result = await supabase.rpc('confirm_order_with_inventory', {
      p_order_id: orderId,
      p_user_id: userId,
    });
    rpcError = result.error;
    console.log('[confirmOrder] RPC completado', { 
      rpcError: rpcError?.message, 
      rpcErrorCode: rpcError?.code, 
      rpcErrorDetails: rpcError?.details, 
      rpcErrorHint: rpcError?.hint 
    });
  } catch (err) {
    console.error('[confirmOrder] RPC exception', { err: err.message, stack: err.stack });
    rpcError = err;
  }

  if (rpcError) {
    console.log('[confirmOrder] RPC error - retornando error', { rpcError: rpcError.message });
    return { error: rpcError.message };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/cocina");
  revalidatePath("/delivery");
  revalidatePath("/inventario");

  return { 
    success: "Orden confirmada e inventario descontado",
    warnings: stockCheck.warnings || []
  };
}

export async function advanceOrderStatus(orderId, newStatus) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    return { error: "No autenticado" };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('status, fulfillment_type, payment_method_id, channel')
    .eq('id', orderId)
    .single();

  if (!order) {
    return { error: "Orden no encontrada" };
  }

  const parsed = advanceOrderStatusSchema.safeParse({ order_id: orderId, new_status: newStatus, current_status: order.status });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (!isValidTransition(order.status, newStatus)) {
    return { error: `Transición inválida: ${order.status} -> ${newStatus}` };
  }

  // No se puede completar una orden cuyo método de pago exige comprobante si
  // éste no ha sido registrado y aprobado. Se valida en el servidor (no confiar
  // solo en la UI).
  if (newStatus === 'completed') {
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('provider_code')
      .eq('id', order.payment_method_id)
      .maybeSingle();

    if (paymentMethod && requiresPaymentProof(paymentMethod)) {
      const { data: approvedProof } = await supabase
        .from('order_payment_proofs')
        .select('id')
        .eq('order_id', orderId)
        .eq('status', 'approved')
        .maybeSingle();

      if (!approvedProof) {
        return { error: "Debes registrar y aprobar el comprobante de pago antes de completar la orden" };
      }
    }
  }

  const allowedRoles = {
    confirmed: ['owner', 'admin', 'cajero', 'mesero'],
    in_kitchen: ['owner', 'admin', 'cocina'],
    ready: ['owner', 'admin', 'cocina'],
    out_for_delivery: ['owner', 'admin', 'delivery'],
    served: ['owner', 'admin', 'mesero', 'cajero'],
    completed: ['owner', 'admin', 'delivery', 'mesero', 'cajero'],
    cancelled: ['owner', 'admin', 'cajero', 'mesero'],
  };

  if (!allowedRoles[newStatus]?.includes(userRole)) {
    return { error: "No tienes permisos para realizar esta transición" };
  }

  if (newStatus === 'confirmed') {
    return await confirmOrder(orderId);
  }

  const { error } = await supabase.rpc('advance_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_user_id: userId,
  });

  if (error) {
    return { error: error.message };
  }

  // Fase 8: al completar la orden, generar factura automáticamente.
  if (newStatus === 'completed') {
    try {
      const { createInvoiceFromOrder } = await import('@/features/caja/core');
      await createInvoiceFromOrder(supabase, { orderId, userId });
    } catch (invErr) {
      console.error("[advanceOrderStatus] Error generando factura:", invErr.message);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/cocina");
  revalidatePath("/delivery");
  revalidatePath("/tracking");

  return { success: `Estado actualizado a ${newStatus}` };
}

export async function assignDeliveryDriver(orderId) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!['owner', 'admin', 'delivery'].includes(userRole)) {
    return { error: "No tienes permisos para tomar entregas" };
  }

  const parsed = assignDeliverySchema.safeParse({ order_id: orderId, driver_id: userId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: success, error } = await supabase.rpc('assign_delivery_driver', {
    p_order_id: orderId,
    p_driver_id: userId,
  });

  if (error) {
    return { error: error.message };
  }

  if (!success) {
    return { error: "Esta orden ya fue tomada por otro repartidor" };
  }

  revalidatePath("/delivery");
  revalidatePath("/admin/orders");
  revalidatePath("/tracking");

  return { success: "Entrega asignada correctamente" };
}

export async function completeDelivery(orderId) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!['owner', 'admin', 'delivery'].includes(userRole)) {
    return { error: "No tienes permisos para completar entregas" };
  }

  const { error } = await supabase.rpc('complete_delivery', {
    p_order_id: orderId,
    p_user_id: userId,
  });

  if (error) {
    return { error: error.message };
  }

  // Fase 8: al completar la entrega, generar factura automáticamente.
  try {
    const { createInvoiceFromOrder } = await import('@/features/caja/core');
    await createInvoiceFromOrder(supabase, { orderId, userId });
  } catch (invErr) {
    console.error("[completeDelivery] Error generando factura:", invErr.message);
  }

  revalidatePath("/delivery");
  revalidatePath("/admin/orders");
  revalidatePath("/tracking");

  return { success: "Entrega completada" };
}

export async function cancelOrder(orderId) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!['owner', 'admin', 'cajero', 'mesero'].includes(userRole)) {
    return { error: "No tienes permisos para cancelar órdenes" };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (!order) {
    return { error: "Orden no encontrada" };
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    return { error: "No se puede cancelar una orden completada o ya cancelada" };
  }

  const { error } = await supabase.rpc('advance_order_status', {
    p_order_id: orderId,
    p_new_status: 'cancelled',
    p_user_id: userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/cocina");
  revalidatePath("/delivery");
  revalidatePath("/tracking");

  return { success: "Orden cancelada" };
}

export async function listOrders(filters = {}) {
  const supabase = await createClient();
  const userRole = await getCurrentUserRole();

  if (!userRole || !['owner', 'admin', 'cajero', 'mesero', 'cocina', 'delivery'].includes(userRole)) {
    return { error: "No autenticado o sin permisos" };
  }

  const {
    page = 1,
    pageSize = 20,
    status,
    fulfillment_type,
    channel,
    date_from,
    date_to,
    search,
  } = filters;

  let query = supabase
    .from('orders')
    .select(`
      *,
      profile:profiles!orders_profile_id_fkey(id, full_name, phone),
      guest_customer:guest_customers(id, full_name, phone, address),
      payment_method:payment_methods(id, name, currency, provider_code),
      payment_proofs:order_payment_proofs(
        id,
        reference_number,
        payer_phone,
        payer_id_number,
        receipt_path,
        status,
        review_notes,
        created_at
      ),
      order_items(
        id,
        quantity,
        unit_price_ves,
        unit_price_usd,
        product:products(id, name),
        combo:combos(id, name),
        order_item_extras(
          id,
          quantity,
          unit_price_ves,
          unit_price_usd,
          extra:product_extras(id, name)
        )
      ),
      order_status_history(
        id,
        from_status,
        to_status,
        changed_by,
        created_at,
        changed_by_profile:profiles!order_status_history_changed_by_fkey(full_name)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status && status.length) {
    query = query.in('status', status);
  }
  if (fulfillment_type && fulfillment_type.length) {
    query = query.in('fulfillment_type', fulfillment_type);
  }
  if (channel && channel.length) {
    query = query.in('channel', channel);
  }
  if (date_from) {
    query = query.gte('created_at', date_from);
  }
  if (date_to) {
    query = query.lte('created_at', date_to);
  }
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,profile.full_name.ilike.%${search}%,guest_customer.full_name.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return { error: error.message };
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

export async function getOrderById(orderId) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return { error: "No autenticado" };
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profile:profiles!orders_profile_id_fkey(id, full_name, phone, avatar_url),
      guest_customer:guest_customers(id, full_name, phone, address),
      table:restaurant_tables(id, name, capacity),
      payment_method:payment_methods(id, name, currency),
      payment_proofs:order_payment_proofs(
        id,
        reference_number,
        payer_phone,
        payer_id_number,
        receipt_path,
        status,
        review_notes,
        created_at
      ),
      order_items(
        id,
        quantity,
        unit_price_ves,
        unit_price_usd,
        notes,
        product:products(id, name, image_url),
        combo:combos(id, name, image_url),
        order_item_extras(
          id,
          quantity,
          unit_price_ves,
          unit_price_usd,
          extra:product_extras(id, name)
        )
      ),
      order_status_history(
        id,
        from_status,
        to_status,
        changed_by,
        created_at,
        changed_by_profile:profiles!order_status_history_changed_by_fkey(full_name)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function saveOrderPaymentProof(formData) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!['owner', 'admin', 'cajero', 'mesero'].includes(userRole)) {
    return { error: "No tienes permisos para registrar el comprobante de pago" };
  }

  const parsed = saveOrderProofSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const d = parsed.data;

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_method_id, status, channel")
    .eq("id", d.order_id)
    .single();

  if (!order) {
    return { error: "Orden no encontrada" };
  }

  if (!order.payment_method_id || order.payment_method_id !== d.payment_method_id) {
    return { error: "El método de pago no coincide con el de la orden" };
  }

  if (order.status === "completed" || order.status === "cancelled") {
    return { error: "No se puede registrar el comprobante en una orden completada o cancelada" };
  }

  const { data: existing } = await supabase
    .from("order_payment_proofs")
    .select("id")
    .eq("order_id", d.order_id)
    .limit(1)
    .maybeSingle();

  const payload = {
    order_id: d.order_id,
    payment_method_id: d.payment_method_id,
    reference_number: d.reference_number,
    payer_phone: d.payer_phone || null,
    payer_id_number: d.payer_id_number || null,
    receipt_path: d.receipt_path,
    // El staff que registra el comprobante confirma que el pago fue recibido,
    // por lo que queda aprobado de inmediato.
    status: "approved",
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  };

  const { error: saveError } = existing
    ? await supabase.from("order_payment_proofs").update(payload).eq("id", existing.id)
    : await supabase.from("order_payment_proofs").insert(payload);

  if (saveError) {
    return { error: saveError.message };
  }

  // Fase 8: al aprobar el comprobante, crear transacción financiera de venta.
  // RB-04: se guarda la tasa de cambio como snapshot histórico.
  // Opción A: si no hay sesión de caja abierta, la venta queda "huérfana"
  // (cash_session_id null). Al cerrar la sesión del día, esas ventas se incluyen
  // en el arqueo y se anclan a dicha sesión. No bloqueamos el cobro por esto.
  try {
    const { getOpenCashSession, createSaleTransaction, validateCashSessionForPayment } = await import('@/features/caja/core');
    const { data: pm } = await supabase
      .from('payment_methods')
      .select('provider_code')
      .eq('id', d.payment_method_id)
      .maybeSingle();
    const isCash = pm && (pm.provider_code === null || pm.provider_code === undefined);
    const sessionResult = await validateCashSessionForPayment(supabase, isCash);
    const cashSessionId = sessionResult.ok ? sessionResult.session?.id || null : null;
    const { getBcvRate } = await import('@/lib/bcv');
    let rate;
    try { rate = await getBcvRate(); } catch { rate = 1; }
    await createSaleTransaction(supabase, {
      orderId: order.id,
      cashSessionId,
      amount: order.total_ves,
      currency: order.currency || 'VES',
      exchangeRate: rate,
      userId,
    });
  } catch (txnErr) {
    console.error("[saveOrderPaymentProof] Error creando transacción financiera:", txnErr.message);
  }

  // Canal teléfono/WhatsApp: al registrar el comprobante aprobado, la orden
  // confirma y pasa a la cola de cocina (el cobro ya quedó registrado).
  if (order.channel === "phone" && order.status === "pending") {
    await confirmOrderForKitchen(order.id, userId, supabase);
  }

  revalidatePath("/admin/orders");

  return { success: existing ? "Comprobante actualizado" : "Comprobante registrado" };
}

export async function getOrderByNumber(orderNumber) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profile:profiles!orders_profile_id_fkey(id, full_name, phone),
      guest_customer:guest_customers(id, full_name, phone, address),
      order_items(
        id,
        quantity,
        unit_price_ves,
        unit_price_usd,
        product:products(id, name),
        combo:combos(id, name),
        order_item_extras(
          id,
          quantity,
          unit_price_ves,
          unit_price_usd,
          extra:product_extras(id, name)
        )
      ),
      order_status_history(
        id,
        from_status,
        to_status,
        created_at
      )
    `)
    .eq('order_number', orderNumber)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function listOrdersForKitchen() {
  const supabase = await createClient();
  const userRole = await getCurrentUserRole();

  if (!['owner', 'admin', 'cocina'].includes(userRole)) {
    return { error: "Sin permisos" };
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profile:profiles!orders_profile_id_fkey(full_name),
      guest_customer:guest_customers(full_name),
      table:restaurant_tables(name),
      order_items(
        id,
        quantity,
        notes,
        product:products(id, name),
        combo:combos(id, name),
        order_item_extras(
          id,
          quantity,
          extra:product_extras(id, name)
        )
      )
    `)
    .in('status', ['confirmed', 'in_kitchen', 'ready'])
    .order('created_at', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function listOrdersForDelivery() {
  const supabase = await createClient();
  const userRole = await getCurrentUserRole();

  if (!['owner', 'admin', 'delivery'].includes(userRole)) {
    return { error: "Sin permisos" };
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profile:profiles!orders_profile_id_fkey(full_name, phone),
      guest_customer:guest_customers(full_name, phone, address),
      order_items(
        id,
        quantity,
        product:products(id, name),
        combo:combos(id, name)
      )
    `)
    .eq('fulfillment_type', 'delivery')
    .in('status', ['ready', 'out_for_delivery'])
    .order('created_at', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}