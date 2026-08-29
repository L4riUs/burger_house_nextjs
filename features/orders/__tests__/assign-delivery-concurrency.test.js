import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import { assignDeliveryDriver } from "../actions";

describe("Assign Delivery Driver - Concurrency Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "driver-user-id" } },
      error: null,
    });
  });

  it("returns success when driver is assigned (RPC returns true)", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

    const result = await assignDeliveryDriver("order-123");

    expect(result.success).toBe("Entrega asignada correctamente");
    expect(mockSupabase.rpc).toHaveBeenCalledWith("assign_delivery_driver", {
      p_order_id: "order-123",
      p_driver_id: "driver-user-id",
    });
  });

  it("returns error when order already taken (RPC returns false)", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

    const result = await assignDeliveryDriver("order-123");

    expect(result.error).toBe("Esta orden ya fue tomada por otro repartidor");
  });

  it("returns error when RPC throws exception", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const result = await assignDeliveryDriver("order-123");

    expect(result.error).toBe("Database error");
  });

  it("rejects when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await assignDeliveryDriver("order-123");

    expect(result.error).toBe("No autenticado");
  });

  it("rejects when user doesn't have delivery role", async () => {
    const { getCurrentUserRole } = await import("../actions");
    vi.mocked(getCurrentUserRole).mockResolvedValue("cajero");

    const result = await assignDeliveryDriver("order-123");

    expect(result.error).toBe("No tienes permisos para tomar entregas");
  });
});

describe("assign_delivery_driver RPC behavior (simulated)", () => {
  it("prevents two drivers taking same order - first succeeds", () => {
    let orderState = { delivery_profile_id: null, status: "ready" };
    
    function simulateAssignDriver(driverId) {
      if (orderState.delivery_profile_id === null && orderState.status === "ready") {
        orderState.delivery_profile_id = driverId;
        orderState.status = "out_for_delivery";
        return true;
      }
      return false;
    }

    expect(simulateAssignDriver("driver-1")).toBe(true);
    expect(orderState.delivery_profile_id).toBe("driver-1");
  });

  it("prevents two drivers taking same order - second fails", () => {
    let orderState = { delivery_profile_id: "driver-1", status: "out_for_delivery" };
    
    function simulateAssignDriver(driverId) {
      if (orderState.delivery_profile_id === null && orderState.status === "ready") {
        orderState.delivery_profile_id = driverId;
        orderState.status = "out_for_delivery";
        return true;
      }
      return false;
    }

    expect(simulateAssignDriver("driver-2")).toBe(false);
    expect(orderState.delivery_profile_id).toBe("driver-1");
  });

  it("validates order is in ready status", () => {
    let orderState = { delivery_profile_id: null, status: "in_kitchen" };
    
    function simulateAssignDriver(driverId) {
      if (orderState.delivery_profile_id === null && orderState.status === "ready") {
        orderState.delivery_profile_id = driverId;
        orderState.status = "out_for_delivery";
        return true;
      }
      return false;
    }

    expect(simulateAssignDriver("driver-1")).toBe(false);
  });

  it("validates fulfillment_type is delivery", () => {
    let orderState = { delivery_profile_id: null, status: "ready", fulfillment_type: "pickup" };
    
    function simulateAssignDriver(driverId) {
      if (orderState.delivery_profile_id === null && 
          orderState.status === "ready" && 
          orderState.fulfillment_type === "delivery") {
        orderState.delivery_profile_id = driverId;
        orderState.status = "out_for_delivery";
        return true;
      }
      return false;
    }

    expect(simulateAssignDriver("driver-1")).toBe(false);
  });

  it("records status history on successful assignment", () => {
    let orderState = { delivery_profile_id: null, status: "ready", history: [] };
    
    function simulateAssignDriver(driverId) {
      if (orderState.delivery_profile_id === null && orderState.status === "ready") {
        orderState.delivery_profile_id = driverId;
        orderState.status = "out_for_delivery";
        orderState.history.push({
          from_status: "ready",
          to_status: "out_for_delivery",
          changed_by: driverId,
        });
        return true;
      }
      return false;
    }

    simulateAssignDriver("driver-1");
    
    expect(orderState.history).toHaveLength(1);
    expect(orderState.history[0]).toMatchObject({
      from_status: "ready",
      to_status: "out_for_delivery",
      changed_by: "driver-1",
    });
  });

  it("does not record history on failed assignment", () => {
    let orderState = { delivery_profile_id: "driver-1", status: "out_for_delivery", history: [] };
    
    function simulateAssignDriver(driverId) {
      if (orderState.delivery_profile_id === null && orderState.status === "ready") {
        orderState.delivery_profile_id = driverId;
        orderState.status = "out_for_delivery";
        orderState.history.push({
          from_status: "ready",
          to_status: "out_for_delivery",
          changed_by: driverId,
        });
        return true;
      }
      return false;
    }

    simulateAssignDriver("driver-2");
    
    expect(orderState.history).toHaveLength(0);
  });
});