import { describe, it, expect } from "vitest";

describe("Sanity check", () => {
  it("Vitest funciona correctamente", () => {
    expect(1 + 1).toBe(2);
  });

  it("Zod está disponible", async () => {
    const { z } = await import("zod");
    const schema = z.string();
    expect(schema.parse("hello")).toBe("hello");
  });

  it("Zustand está disponible", async () => {
    const { create } = await import("zustand");
    const useStore = create((set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }));
    expect(useStore.getState().count).toBe(0);
    useStore.getState().increment();
    expect(useStore.getState().count).toBe(1);
  });
});
