"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getRoleDisplayName, getRoleBadgeVariant } from "@/features/auth/role-logic";
import { PencilIcon } from "lucide-react";

export function UserCards({ users, onEditUser }) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron usuarios
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <Card key={user.id}>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {user.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">
                {user.full_name}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {user.email || "Sin correo"}
              </p>
            </div>
            <Badge variant={getRoleBadgeVariant(user.role)}>
              {getRoleDisplayName(user.role)}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {user.phone || "Sin teléfono"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditUser(user)}
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
