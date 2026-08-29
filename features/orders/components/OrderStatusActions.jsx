"use client";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getValidTransitions, getStatusLabel, canCancel } from "../state-machine";
import { advanceOrderStatus, cancelOrder, assignDeliveryDriver, completeDelivery } from "../actions";
import { useTransition, useState } from "react";
import { Loader2, Truck, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_ACTIONS = {
  confirmed: { label: 'Confirmar', icon: CheckCircle, variant: 'default' },
  in_kitchen: { label: 'En Cocina', icon: RotateCcw, variant: 'default' },
  ready: { label: 'Marcar Lista', icon: CheckCircle, variant: 'default' },
  out_for_delivery: { label: 'En Reparto', icon: Truck, variant: 'default' },
  served: { label: 'Servir', icon: CheckCircle, variant: 'default' },
  completed: { label: 'Completar', icon: CheckCircle, variant: 'default' },
  cancelled: { label: 'Cancelar', icon: XCircle, variant: 'destructive' },
};

export function OrderStatusActions({ order }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });

  const validTransitions = getValidTransitions(order.status);

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
        toast.error(result.error);
      } else {
        toast.success(result.success);
      }
    });
  };

  const handleConfirm = async () => {
    if (confirmDialog.action === 'cancel') {
      startTransition(async () => {
        const result = await cancelOrder(order.id);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success);
        }
        setConfirmDialog({ open: false, action: null });
      });
    } else if (confirmDialog.action === 'assign_delivery') {
      startTransition(async () => {
        const result = await assignDeliveryDriver(order.id);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success);
        }
        setConfirmDialog({ open: false, action: null });
      });
    } else if (confirmDialog.action === 'complete_delivery') {
      startTransition(async () => {
        const result = await completeDelivery(order.id);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success);
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
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            Acciones <RotateCcw className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
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
                disabled={isPending}
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
        </DropdownMenuContent>
      </DropdownMenu>

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