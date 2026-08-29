import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  getValidTransitions,
  canCancel,
  ORDER_STATUSES,
  getStatusLabel,
  getStatusColor,
  VALID_TRANSITIONS,
} from "../state-machine";

describe("State Machine - Order Status Transitions", () => {
  describe("VALID_TRANSITIONS structure", () => {
    it("defines all expected statuses", () => {
      expect(Object.keys(VALID_TRANSITIONS)).toEqual([
        "pending",
        "confirmed",
        "in_kitchen",
        "ready",
        "out_for_delivery",
        "served",
        "completed",
        "cancelled",
      ]);
    });

    it("pending can go to confirmed or cancelled", () => {
      expect(VALID_TRANSITIONS.pending).toEqual(["confirmed", "cancelled"]);
    });

    it("confirmed can go to in_kitchen or cancelled", () => {
      expect(VALID_TRANSITIONS.confirmed).toEqual(["in_kitchen", "cancelled"]);
    });

    it("in_kitchen can go to ready or cancelled", () => {
      expect(VALID_TRANSITIONS.in_kitchen).toEqual(["ready", "cancelled"]);
    });

    it("ready can go to out_for_delivery, served, or cancelled", () => {
      expect(VALID_TRANSITIONS.ready).toEqual([
        "out_for_delivery",
        "served",
        "cancelled",
      ]);
    });

    it("out_for_delivery can go to completed or cancelled", () => {
      expect(VALID_TRANSITIONS.out_for_delivery).toEqual([
        "completed",
        "cancelled",
      ]);
    });

    it("served can go to completed or cancelled", () => {
      expect(VALID_TRANSITIONS.served).toEqual(["completed", "cancelled"]);
    });

    it("completed has no valid transitions", () => {
      expect(VALID_TRANSITIONS.completed).toEqual([]);
    });

    it("cancelled has no valid transitions", () => {
      expect(VALID_TRANSITIONS.cancelled).toEqual([]);
    });
  });

  describe("isValidTransition", () => {
    describe("valid transitions (happy path)", () => {
      it("pending -> confirmed", () => {
        expect(isValidTransition("pending", "confirmed")).toBe(true);
      });

      it("confirmed -> in_kitchen", () => {
        expect(isValidTransition("confirmed", "in_kitchen")).toBe(true);
      });

      it("in_kitchen -> ready", () => {
        expect(isValidTransition("in_kitchen", "ready")).toBe(true);
      });

      it("ready -> out_for_delivery", () => {
        expect(isValidTransition("ready", "out_for_delivery")).toBe(true);
      });

      it("ready -> served", () => {
        expect(isValidTransition("ready", "served")).toBe(true);
      });

      it("out_for_delivery -> completed", () => {
        expect(isValidTransition("out_for_delivery", "completed")).toBe(true);
      });

      it("served -> completed", () => {
        expect(isValidTransition("served", "completed")).toBe(true);
      });
    });

    describe("cancellation from any non-terminal state", () => {
      it("pending -> cancelled", () => {
        expect(isValidTransition("pending", "cancelled")).toBe(true);
      });

      it("confirmed -> cancelled", () => {
        expect(isValidTransition("confirmed", "cancelled")).toBe(true);
      });

      it("in_kitchen -> cancelled", () => {
        expect(isValidTransition("in_kitchen", "cancelled")).toBe(true);
      });

      it("ready -> cancelled", () => {
        expect(isValidTransition("ready", "cancelled")).toBe(true);
      });

      it("out_for_delivery -> cancelled", () => {
        expect(isValidTransition("out_for_delivery", "cancelled")).toBe(true);
      });

      it("served -> cancelled", () => {
        expect(isValidTransition("served", "cancelled")).toBe(true);
      });
    });

    describe("invalid transitions", () => {
      it("pending -> in_kitchen (skip confirmed)", () => {
        expect(isValidTransition("pending", "in_kitchen")).toBe(false);
      });

      it("pending -> ready (skip confirmed, in_kitchen)", () => {
        expect(isValidTransition("pending", "ready")).toBe(false);
      });

      it("confirmed -> ready (skip in_kitchen)", () => {
        expect(isValidTransition("confirmed", "ready")).toBe(false);
      });

      it("confirmed -> out_for_delivery", () => {
        expect(isValidTransition("confirmed", "out_for_delivery")).toBe(false);
      });

      it("in_kitchen -> out_for_delivery (skip ready)", () => {
        expect(isValidTransition("in_kitchen", "out_for_delivery")).toBe(false);
      });

      it("in_kitchen -> served (skip ready)", () => {
        expect(isValidTransition("in_kitchen", "served")).toBe(false);
      });

      it("ready -> completed (skip out_for_delivery/served)", () => {
        expect(isValidTransition("ready", "completed")).toBe(false);
      });

      it("completed -> any (terminal state)", () => {
        expect(isValidTransition("completed", "cancelled")).toBe(false);
        expect(isValidTransition("completed", "pending")).toBe(false);
      });

      it("cancelled -> any (terminal state)", () => {
        expect(isValidTransition("cancelled", "pending")).toBe(false);
        expect(isValidTransition("cancelled", "confirmed")).toBe(false);
      });

      it("backwards transitions", () => {
        expect(isValidTransition("confirmed", "pending")).toBe(false);
        expect(isValidTransition("in_kitchen", "confirmed")).toBe(false);
        expect(isValidTransition("ready", "in_kitchen")).toBe(false);
        expect(isValidTransition("out_for_delivery", "ready")).toBe(false);
        expect(isValidTransition("served", "ready")).toBe(false);
      });

      it("unknown status returns false", () => {
        expect(isValidTransition("unknown", "pending")).toBe(false);
        expect(isValidTransition("pending", "unknown")).toBe(false);
      });
    });
  });

  describe("getValidTransitions", () => {
    it("returns correct transitions for each status", () => {
      expect(getValidTransitions("pending")).toEqual(["confirmed", "cancelled"]);
      expect(getValidTransitions("confirmed")).toEqual([
        "in_kitchen",
        "cancelled",
      ]);
      expect(getValidTransitions("in_kitchen")).toEqual(["ready", "cancelled"]);
      expect(getValidTransitions("ready")).toEqual([
        "out_for_delivery",
        "served",
        "cancelled",
      ]);
      expect(getValidTransitions("out_for_delivery")).toEqual([
        "completed",
        "cancelled",
      ]);
      expect(getValidTransitions("served")).toEqual(["completed", "cancelled"]);
      expect(getValidTransitions("completed")).toEqual([]);
      expect(getValidTransitions("cancelled")).toEqual([]);
    });

    it("returns empty array for unknown status", () => {
      expect(getValidTransitions("unknown")).toEqual([]);
    });
  });

  describe("canCancel", () => {
    it("returns true for all non-terminal states", () => {
      expect(canCancel("pending")).toBe(true);
      expect(canCancel("confirmed")).toBe(true);
      expect(canCancel("in_kitchen")).toBe(true);
      expect(canCancel("ready")).toBe(true);
      expect(canCancel("out_for_delivery")).toBe(true);
      expect(canCancel("served")).toBe(true);
    });

    it("returns false for terminal states", () => {
      expect(canCancel("completed")).toBe(false);
      expect(canCancel("cancelled")).toBe(false);
    });
  });

  describe("ORDER_STATUSES", () => {
    it("contains all statuses", () => {
      expect(ORDER_STATUSES).toEqual([
        "pending",
        "confirmed",
        "in_kitchen",
        "ready",
        "out_for_delivery",
        "served",
        "completed",
        "cancelled",
      ]);
    });
  });

  describe("getStatusLabel", () => {
    it("returns correct Spanish labels", () => {
      expect(getStatusLabel("pending")).toBe("Pendiente");
      expect(getStatusLabel("confirmed")).toBe("Confirmada");
      expect(getStatusLabel("in_kitchen")).toBe("En Cocina");
      expect(getStatusLabel("ready")).toBe("Lista");
      expect(getStatusLabel("out_for_delivery")).toBe("En Reparto");
      expect(getStatusLabel("served")).toBe("Servida");
      expect(getStatusLabel("completed")).toBe("Completada");
      expect(getStatusLabel("cancelled")).toBe("Cancelada");
    });

    it("returns status itself for unknown", () => {
      expect(getStatusLabel("unknown")).toBe("unknown");
    });
  });

  describe("getStatusColor", () => {
    it("returns correct Tailwind classes", () => {
      expect(getStatusColor("pending")).toBe(
        "bg-yellow-100 text-yellow-800"
      );
      expect(getStatusColor("confirmed")).toBe(
        "bg-blue-100 text-blue-800"
      );
      expect(getStatusColor("in_kitchen")).toBe(
        "bg-orange-100 text-orange-800"
      );
      expect(getStatusColor("ready")).toBe(
        "bg-green-100 text-green-800"
      );
      expect(getStatusColor("out_for_delivery")).toBe(
        "bg-purple-100 text-purple-800"
      );
      expect(getStatusColor("served")).toBe(
        "bg-indigo-100 text-indigo-800"
      );
      expect(getStatusColor("completed")).toBe(
        "bg-gray-100 text-gray-800"
      );
      expect(getStatusColor("cancelled")).toBe(
        "bg-red-100 text-red-800"
      );
    });

    it("returns default for unknown", () => {
      expect(getStatusColor("unknown")).toBe(
        "bg-gray-100 text-gray-800"
      );
    });
  });
});