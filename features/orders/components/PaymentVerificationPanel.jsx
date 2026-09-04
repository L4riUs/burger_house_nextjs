"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, CreditCard } from "lucide-react";
import { requiresPaymentProof } from "../payment-verification";
import { saveOrderPaymentProof } from "../actions";
import { PaymentProofUpload } from "../pos/components/PaymentProofUpload";

const STATUS_LABEL = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function PaymentVerificationPanel({ order, onRefresh }) {
  const paymentProof = (order.payment_proofs && order.payment_proofs[0]) || null;
  const method = order.payment_method;
  const initialStatus = paymentProof ? (paymentProof.status || "pending") : null;

  const [referenceNumber, setReferenceNumber] = useState(paymentProof?.reference_number || "");
  const [payerPhone, setPayerPhone] = useState(paymentProof?.payer_phone || "");
  const [payerIdNumber, setPayerIdNumber] = useState(paymentProof?.payer_id_number || "");
  const [receiptPath, setReceiptPath] = useState(paymentProof?.receipt_path || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedStatus, setSavedStatus] = useState(initialStatus);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const hasSavedProof = !!savedStatus;

  if (!method || !requiresPaymentProof(method)) {
    return null;
  }

  const isPagoMovil = method.provider_code === "pago_movil";

  // Validación client-side consistente con saveOrderProofSchema: número de
  // referencia + comprobante foto obligatorios; en Pago Móvil también teléfono
  // y cédula del pagador. El servidor re-validará igualmente.
  const referenceValid = !!referenceNumber && referenceNumber.trim().length > 0;
  const receiptValid = !!receiptPath && receiptPath.trim().length > 0;
  const payerPhoneValid = !isPagoMovil || (!!payerPhone && payerPhone.trim().length > 0);
  const payerIdValid = !isPagoMovil || (!!payerIdNumber && payerIdNumber.trim().length > 0);
  const canSubmit = referenceValid && receiptValid && payerPhoneValid && payerIdValid;

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setError(null);

    if (!canSubmit) {
      return;
    }

    setSaving(true);
    const result = await saveOrderPaymentProof({
      order_id: order.id,
      payment_method_id: method.id,
      reference_number: referenceNumber,
      payer_phone: payerPhone || null,
      payer_id_number: payerIdNumber || null,
      receipt_path: receiptPath,
      provider_code: method.provider_code,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setSavedStatus("approved");
      onRefresh?.();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Verificación de pago
          </span>
          {savedStatus && (
            <Badge variant="outline">{STATUS_LABEL[savedStatus] || savedStatus}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proof-reference">Número de referencia</Label>
          <Input
            id="proof-reference"
            placeholder="Nº de operación / transferencia"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            aria-invalid={submitAttempted && !referenceValid}
          />
          {submitAttempted && !referenceValid && (
            <p className="text-sm text-destructive">El número de referencia es requerido</p>
          )}
        </div>

        {isPagoMovil && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proof-phone">Teléfono del pagador</Label>
              <Input
                id="proof-phone"
                placeholder="0412-0000000"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                aria-invalid={submitAttempted && !payerPhoneValid}
              />
              {submitAttempted && !payerPhoneValid && (
                <p className="text-sm text-destructive">El teléfono del pagador es requerido</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proof-id">Cédula del pagador</Label>
              <Input
                id="proof-id"
                placeholder="V-12345678"
                value={payerIdNumber}
                onChange={(e) => setPayerIdNumber(e.target.value)}
                aria-invalid={submitAttempted && !payerIdValid}
              />
              {submitAttempted && !payerIdValid && (
                <p className="text-sm text-destructive">La cédula del pagador es requerida</p>
              )}
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Comprobante (foto)</Label>
          <PaymentProofUpload value={receiptPath} onChange={setReceiptPath} />
          {submitAttempted && !receiptValid && (
            <p className="text-sm text-destructive">Debe adjuntar el comprobante (foto)</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {hasSavedProof ? "Actualizar comprobante" : "Registrar comprobante"}
        </Button>
      </CardContent>
    </Card>
  );
}