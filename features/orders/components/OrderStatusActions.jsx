"use client";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getValidTransitions, getStatusLabel, canCancel } from "../state-machine";
import { advanceOrderStatus, cancelOrder, assignDeliveryDriver, completeDelivery } from "../actions";
import { useTransition, useState } from "react";
import { Loader2, Truck, CheckCircle, XCircle, RotateCcw, CreditCard, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PaymentVerificationPanel } from "./PaymentVerificationPanel";
import { requiresPaymentProof } from "../payment-verification";

const STATUS_ACTIONS = {
  confirmed: { label: 'Confirmar', icon: CheckCircle, variant: 'default' },
  in_kitchen: { label: 'En Cocina', icon: RotateCcw, variant: 'default' },
  ready: { label: 'Marcar Lista', icon: CheckCircle, variant: 'default' },
  out_for_delivery: { label: 'En Reparto', icon: Truck, variant: 'default' },
  served: { label: 'Servir', icon: CheckCircle, variant: 'default' },
  completed: { label: 'Completar', icon: CheckCircle, variant: 'default' },
  cancelled: { label: 'Cancelar', icon: XCircle, variant: 'destructive' },
};

export function OrderStatusActions({ order, onRefresh, onViewOrder, trigger }) {
  const { toastSuccess, toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const validTransitions = getValidTransitions(order.status);

  // No se puede completar una orden que exige comprobante de pago si éste no
  // está aprobado. Bloqueamos el item en la UI (el servidor también lo valida).
  const methodNeedsProof = requiresPaymentProof(order.payment_method);
  const hasApprovedProof = (order.payment_proofs || []).some(p => p.status === 'approved');
  const completionBlocked = methodNeedsProof && !hasApprovedProof;

  if (!validTransitions.length) {
    return null;
  }

  const handleAction = async (newStatus) => {
    if (newStatus === 'cancelled') {
      setConfirmDialog({ open: true, action: 'cancel' });
      return;
    }

    if (newStatus === 'out_for_delivery') {
      setConfirmDialog({ open: true, action: 'assign_delivery' });
      return;
    }

    if (newStatus === 'completed' && order.status === 'out_for_delivery') {
      setConfirmDialog({ open: true, action: 'complete_delivery' });
      return;
    }

    startTransition(async () => {
      const result = await advanceOrderStatus(order.id, newStatus);
      if (result.error) {
        toastError(result.error);
      } else {
        toastSuccess(result.success);
        onRefresh?.();
      }
    });
  };

  const handleConfirm = async () => {
    if (confirmDialog.action === 'cancel') {
      startTransition(async () => {
        const result = await cancelOrder(order.id);
        if (result.error) {
          toastError(result.error);
        } else {
          toastSuccess(result.success);
          onRefresh?.();
        }
        setConfirmDialog({ open: false, action: null });
      });
    } else if (confirmDialog.action === 'assign_delivery') {
      startTransition(async () => {
        const result = await assignDeliveryDriver(order.id);
        if (result.error) {
          toastError(result.error);
        } else {
          toastSuccess(result.success);
          onRefresh?.();
        }
        setConfirmDialog({ open: false, action: null });
      });
    } else if (confirmDialog.action === 'complete_delivery') {
      startTransition(async () => {
        const result = await completeDelivery(order.id);
        if (result.error) {
          toastError(result.error);
        } else {
          toastSuccess(result.success);
          onRefresh?.();
        }
        setConfirmDialog({ open: false, action: null });
      });
    }
  };

  const confirmMessages = {
    cancel: {
      title: "¿Cancelar orden?",
      description: "Esta acción no se puede deshacer. La orden pasará a estado cancelado.",
    },
    assign_delivery: {
      title: "¿Tomar esta entrega?",
      description: "Se te asignará como repartidor y la orden pasará a 'En Reparto'.",
    },
    complete_delivery: {
      title: "¿Marcar como entregada?",
      description: "La orden pasará a estado completado.",
    },
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={trigger || <Button variant="outline" size="sm" className="w-full" />}>
          {!trigger && (
            <>
              Acciones <RotateCcw className="ml-1 h-3.5 w-3.5" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          {onViewOrder && (
            <>
              <DropdownMenuItem onClick={() => onViewOrder()}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <div className="px-2 py-1 text-xs text-muted-foreground">
            Estado actual: {getStatusLabel(order.status)}
          </div>
          <DropdownMenuSeparator />
          {validTransitions.map((status) => {
            const action = STATUS_ACTIONS[status];
            if (!action) return null;

            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleAction(status)}
                disabled={isPending || (status === 'completed' && completionBlocked)}
                className={cn(
                  action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                )}
              >
                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                {action.label}
                {isPending && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
              </DropdownMenuItem>
            );
          })}
          {completionBlocked && validTransitions.includes('completed') && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1">
              Registra y aprueba el comprobante de pago antes de completar la orden.
            </div>
          )}
          {canCancel(order.status) && !validTransitions.includes('cancelled') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleAction('cancelled')}
                disabled={isPending}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar orden
                {isPending && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
              </DropdownMenuItem>
            </>
          )}
          {order.status === 'served' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Verificar pago
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Verificación de pago</DialogTitle>
          </DialogHeader>
          <PaymentVerificationPanel order={order} onRefresh={onRefresh} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMessages[confirmDialog.action]?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessages[confirmDialog.action]?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog({ open: false, action: null })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className={confirmDialog.action === 'cancel' ? 'bg-destructive' : ''} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}