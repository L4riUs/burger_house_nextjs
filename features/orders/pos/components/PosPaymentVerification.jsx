"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { usePosStore } from "../store";
import { isCashPaymentMethod, requiresPaymentProof } from "../../payment-verification";
import { POS_PAYMENT_VERIFICATION } from "@/lib/config";
import { PaymentProofUpload } from "./PaymentProofUpload";

// Panel de verificación de pago para el POS.
// Solo se muestra cuando el método NO es efectivo (Bs o USD).
// - Modo 'before': se pide en el POS y la captura es obligatoria para crear la orden.
// - Modo 'after' : no se pide en el POS; el comprobante se registra luego desde la
//                  vista de órdenes (admin/orders). Aquí no se muestra nada.
export function PosPaymentVerification() {
  const paymentMethodId = usePosStore((state) => state.paymentMethodId);
  const paymentProof = usePosStore((state) => state.paymentProof);
  const paymentProofReceiptPath = usePosStore((state) => state.paymentProofReceiptPath);
  const setPaymentProof = usePosStore((state) => state.setPaymentProof);
  const setPaymentProofReceiptPath = usePosStore((state) => state.setPaymentProofReceiptPath);

  const [paymentMethod, setPaymentMethod] = useState(null);

  useEffect(() => {
    if (!paymentMethodId) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("payment_methods")
        .select("id, name, currency, provider_code")
        .eq("id", paymentMethodId)
        .single();
      if (active) {
        setPaymentMethod(data || null);
      }
    })();
    return () => {
      active = false;
    };
  }, [paymentMethodId]);

  // En modo 'after' la verificación se hace en la vista de órdenes, no aquí.
  if (POS_PAYMENT_VERIFICATION !== "before") {
    return null;
  }

  if (!paymentMethod || paymentMethod.id !== paymentMethodId || !requiresPaymentProof(paymentMethod)) {
    return null;
  }

  const isPagoMovil = paymentMethod.provider_code === "pago_movil";
  const isRequired = POS_PAYMENT_VERIFICATION === "before";

  const handleField = (field, value) => {
    setPaymentProof({
      provider_code: paymentMethod.provider_code,
      reference_number: paymentProof?.reference_number || "",
      payer_phone: paymentProof?.payer_phone || null,
      payer_id_number: paymentProof?.payer_id_number || null,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Separator />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Verificación de pago</span>
        {isRequired ? (
          <span className="text-xs text-muted-foreground">(obligatoria)</span>
        ) : (
          <span className="text-xs text-muted-foreground">(opcional)</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reference-number">Número de referencia</Label>
        <Input
          id="reference-number"
          placeholder="Nº de operación / transferencia"
          value={paymentProof?.reference_number || ""}
          onChange={(e) => handleField("reference_number", e.target.value)}
        />
      </div>

      {isPagoMovil && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payer-phone">Teléfono del pagador</Label>
            <Input
              id="payer-phone"
              placeholder="0412-0000000"
              value={paymentProof?.payer_phone || ""}
              onChange={(e) => handleField("payer_phone", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payer-id">Cédula del pagador</Label>
            <Input
              id="payer-id"
              placeholder="V-12345678"
              value={paymentProof?.payer_id_number || ""}
              onChange={(e) => handleField("payer_id_number", e.target.value)}
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Comprobante (foto)</Label>
        <PaymentProofUpload
          value={paymentProofReceiptPath}
          onChange={setPaymentProofReceiptPath}
        />
      </div>

      {isRequired && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          La verificación es obligatoria para métodos que no son efectivo.
        </p>
      )}
    </div>
  );
}