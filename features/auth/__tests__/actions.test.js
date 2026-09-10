import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import {
  requestPasswordReset,
  updatePassword,
} from "../actions";

describe("Auth actions", () => {
  beforeEach(() => {
    createClientMock.mockReset();
  });

  it("rechaza solicitudes de recuperación inválidas en el servidor", async () => {
    const result = await requestPasswordReset({ email: "correo-invalido" });

    expect(result.error).toBe("Ingresa un correo válido");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("usa el callback de la aplicación para el enlace de recuperación", async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: { resetPasswordForEmail },
    });
    process.env.NEXT_PUBLIC_SITE_URL = "https://burger.example/";

    await requestPasswordReset({ email: "cliente@burger.com" });

    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "cliente@burger.com",
      { redirectTo: "https://burger.example/auth/callback?next=/reset-password" }
    );
  });

  it("rechaza cambios de contraseña inválidos en el servidor", async () => {
    const result = await updatePassword({
      password: "123456",
      confirmPassword: "654321",
    });

    expect(result.error).toBe("Las contraseñas no coinciden");
    expect(createClientMock).not.toHaveBeenCalled();
  });
});