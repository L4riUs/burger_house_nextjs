"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBcvRate } from "@/lib/bcv";
import { createOrderSchema, advanceOrderStatusSchema, assignDeliverySchema, posCreateOrderSchema } from "./schemas";
import { calculateInventoryMovements, checkStockAvailability } from "./inventory-deduction";
import { isValidTransition, getValidTransitions } from "./state-machine";

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

export async function createOrder(formData) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    return { error: "No autenticado" };
  }

  const parsed = createOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map(e => e.message).join(", ") };
  }

  const data = parsed.data;

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

  if (data.channel !== 'storefront' && !['owner', 'admin', 'cajero', 'mesero'].includes(userRole)) {
    return { error: "No tienes permisos para crear órdenes internas" };
  }

  if (data.channel !== 'storefront' && !data.taken_by) {
    data.taken_by = userId;
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

  let guestCustomerId = null;
  if (data.customer_type === 'guest' && data.guest_customer) {
    const { data: guest, error: guestError } = await supabase
      .from('guest_customers')
      .insert(data.guest_customer)
      .select()
      .single();

    if (guestError) {
      return { error: guestError.message };
    }
    guestCustomerId = guest.id;
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
    if (guestCustomerId) {
      await supabase.from('guest_customers').delete().eq('id', guestCustomerId);
    }
    return { error: orderError.message };
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

  await supabase
    .from('order_status_history')
    .insert({
      order_id: order.id,
      from_status: null,
      to_status: 'pending',
      changed_by: userId,
    });

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
    .select('id, status, cart_items:order_items(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { error: "Orden no encontrada" };
  }

  if (order.status !== 'pending') {
    return { error: "Solo se pueden confirmar órdenes en estado pendiente" };
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
    .select('status, fulfillment_type')
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

import { ALLOW_NEGATIVE_STOCK } from '@/lib/config';