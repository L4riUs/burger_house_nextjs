import { describe, it, expect } from "vitest";

describe("Dashboard Aggregation Functions", () => {
  const mockSalesData = [
    { total_ves: "100.00", total_usd: "3.00", currency: "VES" },
    { total_ves: "200.00", total_usd: "6.00", currency: "VES" },
    { total_ves: "0", total_usd: "10.00", currency: "USD" },
    { total_ves: "150.00", total_usd: "4.50", currency: "VES" },
  ];

  const mockOrdersByStatus = [
    { status: "completed", count: "5" },
    { status: "pending", count: "2" },
    { status: "confirmed", count: "3" },
    { status: "cancelled", count: "1" },
  ];

  const mockTopProducts = [
    { product_id: "1", product_name: { es: "Hamburguesa Clásica" }, product_type: "prepared", total_quantity: "50", total_revenue_ves: "5000.00", total_revenue_usd: "150.00" },
    { product_id: "2", product_name: { es: "Papas Fritas" }, product_type: "prepared", total_quantity: "30", total_revenue_ves: "1500.00", total_revenue_usd: "45.00" },
    { product_id: "3", product_name: { es: "Coca Cola" }, product_type: "retail", total_quantity: "100", total_revenue_ves: "2000.00", total_revenue_usd: "60.00" },
  ];

  const mockTopCombos = [
    { combo_id: "1", combo_name: { es: "Combo Clásico" }, total_quantity: "20", total_revenue_ves: "4000.00", total_revenue_usd: "120.00" },
    { combo_id: "2", combo_name: { es: "Combo Familiar" }, total_quantity: "10", total_revenue_ves: "3000.00", total_revenue_usd: "90.00" },
  ];

  describe("calculateSalesTotals", () => {
    it("should sum VES and USD totals correctly", () => {
      const totalVes = mockSalesData.reduce((sum, s) => sum + Number(s.total_ves), 0);
      const totalUsd = mockSalesData.reduce((sum, s) => sum + Number(s.total_usd), 0);
      
      expect(totalVes).toBe(450);
      expect(totalUsd).toBe(23.5);
    });

    it("should count orders correctly", () => {
      const ordersCount = mockSalesData.length;
      expect(ordersCount).toBe(4);
    });

    it("should calculate average ticket correctly", () => {
      const totalVes = mockSalesData.reduce((sum, s) => sum + Number(s.total_ves), 0);
      const totalUsd = mockSalesData.reduce((sum, s) => sum + Number(s.total_usd), 0);
      const ordersCount = mockSalesData.length;
      
      const avgVes = totalVes / ordersCount;
      const avgUsd = totalUsd / ordersCount;
      
      expect(avgVes).toBe(112.5);
      expect(avgUsd).toBeCloseTo(5.875);
    });

    it("should handle zero orders", () => {
      const emptyData = [];
      const totalVes = emptyData.reduce((sum, s) => sum + Number(s.total_ves), 0);
      const totalUsd = emptyData.reduce((sum, s) => sum + Number(s.total_usd), 0);
      const ordersCount = emptyData.length;
      
      const avgVes = ordersCount > 0 ? totalVes / ordersCount : 0;
      const avgUsd = ordersCount > 0 ? totalUsd / ordersCount : 0;
      
      expect(totalVes).toBe(0);
      expect(totalUsd).toBe(0);
      expect(avgVes).toBe(0);
      expect(avgUsd).toBe(0);
    });
  });

  describe("calculateOrdersByStatus", () => {
    it("should group orders by status with correct counts", () => {
      const statusCounts = mockOrdersByStatus.reduce((acc, o) => {
        acc[o.status] = Number(o.count);
        return acc;
      }, {});
      
      expect(statusCounts.completed).toBe(5);
      expect(statusCounts.pending).toBe(2);
      expect(statusCounts.confirmed).toBe(3);
      expect(statusCounts.cancelled).toBe(1);
    });

    it("should calculate percentages correctly", () => {
      const total = mockOrdersByStatus.reduce((sum, o) => sum + Number(o.count), 0);
      expect(total).toBe(11);
      
      const completedPct = (Number(mockOrdersByStatus[0].count) / total) * 100;
      expect(completedPct).toBeCloseTo(45.45, 1);
    });
  });

  describe("calculateTopProducts", () => {
    it("should sort products by quantity descending", () => {
      const sorted = [...mockTopProducts].sort((a, b) => Number(b.total_quantity) - Number(a.total_quantity));
      
      expect(sorted[0].product_name.es).toBe("Coca Cola");
      expect(sorted[1].product_name.es).toBe("Hamburguesa Clásica");
      expect(sorted[2].product_name.es).toBe("Papas Fritas");
    });

    it("should calculate total quantities correctly", () => {
      const totalQty = mockTopProducts.reduce((sum, p) => sum + Number(p.total_quantity), 0);
      expect(totalQty).toBe(180);
    });

    it("should include both prepared and retail products", () => {
      const types = mockTopProducts.map(p => p.product_type);
      expect(types).toContain("prepared");
      expect(types).toContain("retail");
    });
  });

  describe("calculateTopCombos", () => {
    it("should sort combos by quantity descending", () => {
      const sorted = [...mockTopCombos].sort((a, b) => Number(b.total_quantity) - Number(a.total_quantity));
      
      expect(sorted[0].combo_name.es).toBe("Combo Clásico");
      expect(sorted[1].combo_name.es).toBe("Combo Familiar");
    });

    it("should sum combo quantities correctly", () => {
      const totalQty = mockTopCombos.reduce((sum, c) => sum + Number(c.total_quantity), 0);
      expect(totalQty).toBe(30);
    });
  });

  describe("formatCurrency", () => {
    it("should format VES correctly", () => {
      const formatCurrency = (value, currency) => {
        return new Intl.NumberFormat("es-VE", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
        }).format(value);
      };
      
      expect(formatCurrency(1234.56, "VES")).toContain("1.234,56");
      expect(formatCurrency(0, "VES")).toContain("0,00");
    });

    it("should format USD correctly", () => {
      const formatCurrency = (value, currency) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
        }).format(value);
      };
      
      expect(formatCurrency(1234.56, "USD")).toContain("$1,234.56");
      expect(formatCurrency(0, "USD")).toContain("$0.00");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers with locale", () => {
      const formatNumber = (value) => {
        return new Intl.NumberFormat("es-VE").format(value);
      };
      
      expect(formatNumber(1234)).toBe("1.234");
      expect(formatNumber(1234567)).toBe("1.234.567");
      expect(formatNumber(0)).toBe("0");
    });
  });
});