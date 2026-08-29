import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, userId } = body;

    if (!orderId || !userId) {
      return NextResponse.json({ error: "orderId y userId requeridos" }, { status: 400 });
    }

    const supabase = await createClient();

    console.log('[debug/confirm-order] Probando RPC directamente', { orderId, userId });

    // 1. Verificar que la orden existe
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, order_number')
      .eq('id', orderId)
      .single();

    console.log('[debug/confirm-order] Orden:', { order, orderError });

    if (orderError || !order) {
      return NextResponse.json({ error: "Orden no encontrada", orderError }, { status: 404 });
    }

    // 2. Verificar items de la orden
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        combo_id,
        quantity,
        product:products(product_type)
      `)
      .eq('order_id', orderId);

    console.log('[debug/confirm-order] Items:', { items, itemsError });

    // 3. Llamar RPC
    const { error: rpcError } = await supabase.rpc('confirm_order_with_inventory', {
      p_order_id: orderId,
      p_user_id: userId,
    });

    console.log('[debug/confirm-order] RPC result:', { rpcError });

    // 4. Verificar movimientos creados
    const { data: movements, error: movError } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('order_id', orderId);

    console.log('[debug/confirm-order] Movimientos creados:', { movements, movError });

    return NextResponse.json({
      success: !rpcError,
      order: { id: order.id, order_number: order.order_number, status: order.status },
      items: items || [],
      rpcError: rpcError ? rpcError.message : null,
      rpcErrorCode: rpcError?.code,
      rpcErrorDetails: rpcError?.details,
      rpcErrorHint: rpcError?.hint,
      movementsCreated: movements?.length || 0,
      movements: movements || [],
    });

  } catch (err) {
    console.error('[debug/confirm-order] Exception:', err);
    return NextResponse.json({ 
      error: err.message, 
      stack: err.stack 
    }, { status: 500 });
  }
}