import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar si la función RPC existe
    const { data: routines, error: routinesError } = await supabase
      .rpc('get_routine_info', { routine_name: 'confirm_order_with_inventory' });

    // Alternativa: query directa a information_schema
    const { data: schemaRoutines, error: schemaError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, routine_definition')
      .eq('routine_name', 'confirm_order_with_inventory')
      .single();

    // Verificar estructura de inventory_movements
    const { data: movTable, error: movTableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'inventory_movements')
      .order('ordinal_position');

    return NextResponse.json({
      confirmOrderFunction: schemaRoutines || { exists: false },
      schemaError: schemaError?.message,
      inventoryMovementsColumns: movTable || [],
      movTableError: movTableError?.message,
    });
  } catch (err) {
    console.error('[debug/rpc-info] Exception:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}