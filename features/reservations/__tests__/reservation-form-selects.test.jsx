// @vitest-environment jsdom
import { describe, it, vi, beforeEach, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { reset as resetBaseUiErrors } from "@base-ui/utils/error";
import { ReservationForm } from "../components/ReservationForm";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toastSuccess: () => {},
    toastError: () => {},
  }),
}));

vi.mock("../actions", () => ({
  createGuestForReservation: vi.fn(async () => ({ data: { id: "guest-1" }, success: "ok" })),
}));

function collectBaseUiErrors(fn) {
  const errors = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.map(String).join(" ")));
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  return errors.filter((e) => e.includes("Base UI"));
}

function renderForm() {
  return act(() =>
    render(
      <ReservationForm
        initialData={null}
        onSubmit={() => {}}
        onCancel={() => {}}
        isLoading={false}
        profiles={[
          { id: "p1", full_name: "Ana" },
          { id: "p2", full_name: "Luis" },
        ]}
        guests={[{ id: "g1", full_name: "Juan", phone: "123" }]}
        tables={[{ id: "t1", name: "M1", capacity: 4 }]}
        packages={[]}
      />
    )
  );
}

describe("ReservationForm selects", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetBaseUiErrors();
  });

  it("no dispara warnings de controlled/uncontrolled al alternar tipo de cliente y seleccionar", () => {
    renderForm();
    const getAllBoxes = () => screen.getAllByRole("combobox", { hidden: false });

    const errs = collectBaseUiErrors(() => {
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Registrado" }));
      });
      act(() => {
        fireEvent.click(getAllBoxes()[0]);
      });
      act(() => {
        fireEvent.click(screen.getByText("Ana"));
      });
      act(() => {
        fireEvent.keyDown(document, { key: "Escape" });
      });
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Invitado" }));
      });
      act(() => {
        fireEvent.click(getAllBoxes()[0]);
      });
      act(() => {
        fireEvent.click(screen.getByText("Juan (123)"));
      });
    });

    expect(errs).toEqual([]);
  });

  it("no muestra el valor crudo __none__ en el trigger del select", () => {
    renderForm();
    const trigger = screen.getAllByRole("combobox", { hidden: false })[0];

    expect(trigger.textContent).not.toContain("__none__");
    expect(trigger.textContent).toContain("Seleccione aquí");
  });
});