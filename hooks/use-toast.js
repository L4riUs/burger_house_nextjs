"use client";

import { toast } from "@/components/ui/toast";

/**
 * Wrapper centralizado sobre el manejador de toasts de Base UI.
 *
 * Uso:
 *   const { toastSuccess, toastError, toastInfo } = useToast();
 *   toastError("Ocurrió un error al guardar");
 *   toastSuccess("Guardado correctamente");
 */
export function useToast() {
  const toastSuccess = (message) => {
    toast.add({ title: message, type: "success" });
  };

  const toastError = (message) => {
    toast.add({ title: message, type: "error" });
  };

  const toastInfo = (message) => {
    toast.add({ title: message, type: "info" });
  };

  const toastWarning = (message) => {
    toast.add({ title: message, type: "warning" });
  };

  return { toastSuccess, toastError, toastInfo, toastWarning };
}
