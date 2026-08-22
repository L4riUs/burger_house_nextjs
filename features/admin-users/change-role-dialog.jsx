"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { changeUserRole } from "./actions";
import { canAssignRole } from "@/features/auth/role-logic";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getRoleDisplayName } from "@/features/auth/role-logic";

const ALL_ROLES = ["owner", "admin", "cajero", "mesero", "cocina", "delivery", "cliente"];

export function ChangeRoleDialog({ user, actorRole, open, onOpenChange }) {
  const [selectedRole, setSelectedRole] = useState(user?.role || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const assignableRoles = canAssignRole(actorRole, "owner")
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => r !== "owner");

  const handleChange = useCallback(async () => {
    if (!user || selectedRole === user.role) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await changeUserRole(user.id, selectedRole);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onOpenChange(false);
    router.refresh();
  }, [user, selectedRole, onOpenChange, router]);

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cambiar rol de usuario</AlertDialogTitle>
          <AlertDialogDescription>
            Cambiar el rol de <strong>{user.full_name}</strong> actualmente tiene el rol{" "}
            <Badge variant="outline">{getRoleDisplayName(user.role)}</Badge>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {getRoleDisplayName(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleChange}
            disabled={loading || selectedRole === user.role}
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
